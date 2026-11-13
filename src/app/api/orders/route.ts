import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateOrderNumber } from '@/lib/helpers';
import { calculateOrderTotal } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const tableId = searchParams.get('tableId');
  const search = searchParams.get('search');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const orders = await prisma.order.findMany({
    where: {
      ...(status && status !== 'all' ? { status } : {}),
      ...(tableId ? { tableId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search } },
              { tableName: { contains: search } },
              { payment: { receiptNumber: { contains: search } } },
            ],
          }
        : {}),
    },
    include: {
      items: true,
      table: { select: { id: true, tableName: true, section: true } },
      createdBy: { select: { id: true, fullName: true, username: true } },
      updatedBy: { select: { id: true, fullName: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    tableId: o.tableId,
    tableName: o.tableName,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
    total: calculateOrderTotal(o.items),
    createdBy: o.createdBy.fullName,
    updatedBy: o.updatedBy.fullName,
    payment: o.payment
      ? {
          id: o.payment.id,
          receiptNumber: o.payment.receiptNumber,
          amount: o.payment.amount,
          method: o.payment.method,
          paidAt: o.payment.paidAt,
        }
      : null,
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { tableId, items } = body;

  if (!tableId) {
    return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
  }

  // 1. Verify physical table
  const table = await prisma.cafeTable.findUnique({
    where: { id: tableId },
  });

  if (!table || !table.isActive) {
    return NextResponse.json(
      { error: 'Table not found or is currently deactivated' },
      { status: 400 }
    );
  }

  // 2. Strict check: Table must not already have an Open order
  const existingOpenOrder = await prisma.order.findFirst({
    where: { tableId, status: 'open' },
  });

  if (existingOpenOrder) {
    return NextResponse.json(
      {
        error: 'Table already has an active order',
        orderId: existingOpenOrder.id,
      },
      { status: 409 }
    );
  }

  // 3. Validate items if provided
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'At least one item is required to start an order' },
      { status: 400 }
    );
  }

  // Fetch current menu items to take price snapshots and verify availability
  const itemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: itemIds }, isActive: true },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const item of items) {
    const mi = menuItemMap.get(item.menuItemId);
    if (!mi) {
      return NextResponse.json(
        { error: `Menu item with ID ${item.menuItemId} does not exist or is inactive` },
        { status: 400 }
      );
    }
    if (!mi.isAvailable) {
      return NextResponse.json(
        { error: `Item "${mi.name}" is currently marked as unavailable` },
        { status: 400 }
      );
    }
    if (!item.quantity || item.quantity < 1) {
      return NextResponse.json(
        { error: `Invalid quantity for item "${mi.name}"` },
        { status: 400 }
      );
    }
  }

  const orderNumber = await generateOrderNumber();

  // 4. Create Order and OrderItems in a transaction
  const newOrder = await prisma.$transaction(async (tx) => {
    // Re-check inside transaction to prevent race conditions
    const activeCheck = await tx.order.findFirst({
      where: { tableId, status: 'open' },
    });
    if (activeCheck) {
      throw new Error('Table already has an active order');
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        tableId,
        tableName: table.tableName,
        status: 'open',
        createdById: session.userId,
        updatedById: session.userId,
        items: {
          create: items.map((i: { menuItemId: string; quantity: number; notes?: string }) => {
            const mi = menuItemMap.get(i.menuItemId)!;
            return {
              menuItemId: mi.id,
              itemName: mi.name,
              unitPrice: mi.price, // Snapshot of current price
              quantity: Number(i.quantity),
              notes: i.notes?.trim() || '',
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  });

  return NextResponse.json(newOrder, { status: 201 });
}
