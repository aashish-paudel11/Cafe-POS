import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { calculateOrderTotal } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, categoryId: true, isAvailable: true },
          },
        },
      },
      table: true,
      createdBy: { select: { id: true, fullName: true, username: true } },
      updatedBy: { select: { id: true, fullName: true, username: true } },
      cancelledBy: { select: { id: true, fullName: true } },
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const business = await prisma.businessSettings.findUnique({
    where: { id: 'default' },
  });

  const total = calculateOrderTotal(order.items);

  return NextResponse.json({
    ...order,
    total,
    businessSettings: business,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { items } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
  }

  // 1. Verify order exists and is Open
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (existingOrder.status !== 'open') {
    return NextResponse.json(
      { error: `Cannot modify an order that is already ${existingOrder.status}.` },
      { status: 400 }
    );
  }

  // At least 1 item must remain in an open order
  const validItems = items.filter((i) => i.quantity > 0);
  if (validItems.length === 0) {
    return NextResponse.json(
      { error: 'An open order must contain at least one item. If no items are needed, cancel the order instead.' },
      { status: 400 }
    );
  }

  // Map of existing items in this order to preserve their historical snapshot price
  const existingItemMap = new Map(existingOrder.items.map((i) => [i.menuItemId, i]));

  // For any newly added items, fetch their current price from the menu and ensure availability
  const newItemIds = validItems
    .filter((i) => !existingItemMap.has(i.menuItemId))
    .map((i) => i.menuItemId);

  const newMenuItems = newItemIds.length > 0
    ? await prisma.menuItem.findMany({
        where: { id: { in: newItemIds }, isActive: true },
      })
    : [];

  const newMenuItemMap = new Map(newMenuItems.map((m) => [m.id, m]));

  for (const item of validItems) {
    if (!existingItemMap.has(item.menuItemId)) {
      const mi = newMenuItemMap.get(item.menuItemId);
      if (!mi) {
        return NextResponse.json(
          { error: `Item with ID ${item.menuItemId} does not exist or is inactive` },
          { status: 400 }
        );
      }
      if (!mi.isAvailable) {
        return NextResponse.json(
          { error: `Item "${mi.name}" is currently unavailable and cannot be added.` },
          { status: 400 }
        );
      }
    }
  }

  // Transaction: delete old items and insert updated items with preserved snapshot prices
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Delete existing items for this order
    await tx.orderItem.deleteMany({
      where: { orderId: id },
    });

    // Recreate items with snapshot protection
    const itemsToCreate = validItems.map((item) => {
      const existing = existingItemMap.get(item.menuItemId);
      if (existing) {
        // Retain original unitPrice snapshot
        return {
          orderId: id,
          menuItemId: item.menuItemId,
          itemName: existing.itemName,
          unitPrice: existing.unitPrice,
          quantity: Number(item.quantity),
          notes: item.notes?.trim() || '',
        };
      } else {
        // New item snapshot from current menu
        const mi = newMenuItemMap.get(item.menuItemId)!;
        return {
          orderId: id,
          menuItemId: mi.id,
          itemName: mi.name,
          unitPrice: mi.price,
          quantity: Number(item.quantity),
          notes: item.notes?.trim() || '',
        };
      }
    });

    await tx.orderItem.createMany({
      data: itemsToCreate,
    });

    const refreshed = await tx.order.update({
      where: { id },
      data: {
        updatedById: session.userId,
      },
      include: {
        items: true,
        table: true,
        createdBy: { select: { id: true, fullName: true } },
        updatedBy: { select: { id: true, fullName: true } },
      },
    });

    return refreshed;
  });

  return NextResponse.json({
    ...updatedOrder,
    total: calculateOrderTotal(updatedOrder.items),
  });
}
