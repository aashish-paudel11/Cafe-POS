import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch saved sections from TableSection
  const savedSections = await prisma.tableSection.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  // 2. Also check if there are sections on existing tables not yet in TableSection
  const tables = await prisma.cafeTable.findMany({
    select: { section: true },
  });

  const existingSectionNames = new Set(savedSections.map((s) => s.name.toLowerCase()));
  const missingSectionNames = [
    ...new Set(tables.map((t) => t.section.trim()).filter((s) => s && !existingSectionNames.has(s.toLowerCase()))),
  ];

  // Auto-seed any missing sections so existing tables are preserved
  if (missingSectionNames.length > 0) {
    for (const name of missingSectionNames) {
      const maxOrder = await prisma.tableSection.aggregate({ _max: { displayOrder: true } });
      await prisma.tableSection.create({
        data: {
          name,
          displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        },
      });
    }
  }

  const allSections = await prisma.tableSection.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  // Count active tables in each section
  const sectionCounts = await Promise.all(
    allSections.map(async (s) => {
      const count = await prisma.cafeTable.count({
        where: { section: s.name, isActive: true },
      });
      return {
        id: s.id,
        name: s.name,
        displayOrder: s.displayOrder,
        tableCount: count,
      };
    })
  );

  return NextResponse.json(sectionCounts);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Location / Section name is required.' }, { status: 400 });
  }

  const trimmed = name.trim();

  const existing = await prisma.tableSection.findFirst({
    where: { name: { equals: trimmed } },
  });

  if (existing) {
    return NextResponse.json({ error: `Location "${trimmed}" already exists.` }, { status: 400 });
  }

  const maxOrder = await prisma.tableSection.aggregate({
    _max: { displayOrder: true },
  });

  const newSection = await prisma.tableSection.create({
    data: {
      name: trimmed,
      displayOrder: (maxOrder._max.displayOrder || 0) + 1,
    },
  });

  return NextResponse.json(newSection, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { id, name } = body;

  if (!id || !name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Section ID and new name are required.' }, { status: 400 });
  }

  const trimmed = name.trim();

  const oldSection = await prisma.tableSection.findUnique({
    where: { id },
  });

  if (!oldSection) {
    return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
  }

  // Transaction: update section and all tables assigned to this section
  const updatedSection = await prisma.$transaction(async (tx) => {
    const updated = await tx.tableSection.update({
      where: { id },
      data: { name: trimmed },
    });

    if (oldSection.name !== trimmed) {
      await tx.cafeTable.updateMany({
        where: { section: oldSection.name },
        data: { section: trimmed },
      });
    }

    return updated;
  });

  return NextResponse.json(updatedSection);
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Section ID is required.' }, { status: 400 });
  }

  const section = await prisma.tableSection.findUnique({
    where: { id },
  });

  if (!section) {
    return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
  }

  // Transaction: unassign section from any tables and delete the section
  await prisma.$transaction(async (tx) => {
    await tx.cafeTable.updateMany({
      where: { section: section.name },
      data: { section: '' },
    });

    await tx.tableSection.delete({
      where: { id },
    });
  });

  return NextResponse.json({ success: true, message: `Location "${section.name}" removed.` });
}
