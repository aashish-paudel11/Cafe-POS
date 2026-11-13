import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');
  const availableOnly = searchParams.get('availableOnly') === 'true';

  const items = await prisma.menuItem.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(availableOnly ? { isAvailable: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, price, categoryId, imageUrl, isAvailable } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }

  const maxOrder = await prisma.menuItem.aggregate({
    where: { categoryId },
    _max: { displayOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      name: name.trim(),
      description: description?.trim() || '',
      price: Number(price),
      categoryId,
      imageUrl: imageUrl?.trim() || '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      displayOrder: (maxOrder._max.displayOrder || 0) + 1,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, description, price, categoryId, imageUrl, isAvailable, displayOrder, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  const updatedItem = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(price !== undefined && { price: Number(price) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() }),
      ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
      ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updatedItem);
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  // Soft delete item
  await prisma.menuItem.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
