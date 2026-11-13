import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { calculateOrderTotal } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tables = await prisma.cafeTable.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  // Get active orders for all tables
  const activeOrders = await prisma.order.findMany({
    where: { status: 'open' },
    include: { items: true },
  });

  const orderMap = new Map<string, { orderId: string; total: number; itemCount: number }>();
  activeOrders.forEach((o) => {
    orderMap.set(o.tableId, {
      orderId: o.id,
      total: calculateOrderTotal(o.items),
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    });
  });

  const result = tables.map((t) => ({
    id: t.id,
    tableName: t.tableName,
    capacity: t.capacity,
    section: t.section,
    displayOrder: t.displayOrder,
    status: orderMap.has(t.id) ? 'occupied' : 'available',
    activeOrder: orderMap.get(t.id) || null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { tableName, capacity, section } = body;

  if (!tableName?.trim()) {
    return NextResponse.json({ error: 'Table name is required.' }, { status: 400 });
  }

  const maxOrder = await prisma.cafeTable.aggregate({ _max: { displayOrder: true } });

  const table = await prisma.cafeTable.create({
    data: {
      tableName: tableName.trim(),
      capacity: capacity || 4,
      section: section?.trim() || '',
      displayOrder: (maxOrder._max.displayOrder || 0) + 1,
    },
  });

  return NextResponse.json(table, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { id, tableName, capacity, section, displayOrder, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
  }

  // Don't deactivate a table with active orders
  if (isActive === false) {
    const activeOrder = await prisma.order.findFirst({
      where: { tableId: id, status: 'open' },
    });
    if (activeOrder) {
      return NextResponse.json(
        { error: 'Cannot deactivate a table with an active order.' },
        { status: 400 }
      );
    }
  }

  const table = await prisma.cafeTable.update({
    where: { id },
    data: {
      ...(tableName !== undefined && { tableName: tableName.trim() }),
      ...(capacity !== undefined && { capacity }),
      ...(section !== undefined && { section: section.trim() }),
      ...(displayOrder !== undefined && { displayOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(table);
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
  }

  // Check for active orders
  const activeOrder = await prisma.order.findFirst({
    where: { tableId: id, status: 'open' },
  });
  if (activeOrder) {
    return NextResponse.json({ error: 'Cannot deactivate a table with an active order.' }, { status: 400 });
  }

  // Soft-deactivate instead of delete
  await prisma.cafeTable.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
