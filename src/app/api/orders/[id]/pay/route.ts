import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateReceiptNumber } from '@/lib/helpers';
import { calculateOrderTotal } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { method } = body;

  const validMethods = ['cash', 'qr', 'card', 'other'];
  if (!method || !validMethods.includes(method)) {
    return NextResponse.json(
      { error: `Payment method must be one of: ${validMethods.join(', ')}` },
      { status: 400 }
    );
  }

  // 1. Fetch order with items
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'open') {
    return NextResponse.json(
      { error: `Cannot accept payment for an order that is already ${order.status}.` },
      { status: 400 }
    );
  }

  if (order.payment) {
    return NextResponse.json(
      { error: 'This order already has a recorded payment.', receiptNumber: order.payment.receiptNumber },
      { status: 409 }
    );
  }

  if (order.items.length === 0) {
    return NextResponse.json(
      { error: 'Cannot pay an empty order.' },
      { status: 400 }
    );
  }

  // Calculate final tax-inclusive amount from actual saved items
  const totalAmount = calculateOrderTotal(order.items);
  const receiptNumber = await generateReceiptNumber();

  // Get current business settings snapshot
  const settings = await prisma.businessSettings.findUnique({
    where: { id: 'default' },
  });

  // Execute payment inside an atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // Double check open status in transaction
    const freshOrder = await tx.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!freshOrder || freshOrder.status !== 'open' || freshOrder.payment) {
      throw new Error('Order is no longer eligible for payment');
    }

    const payment = await tx.payment.create({
      data: {
        orderId: id,
        receiptNumber,
        amount: totalAmount,
        method,
        paidById: session.userId,
        // Snapshot business details
        cafeName: settings?.cafeName || 'My Cafe',
        businessName: settings?.businessName || '',
        address: settings?.address || '',
        contactNumber: settings?.contactNumber || '',
        panLabel: settings?.panLabel || 'PAN No.',
        panNumber: settings?.panNumber || '',
        receiptFooter: settings?.receiptFooter || 'Thank you for visiting!',
        taxNote: settings?.taxNote || 'All prices are inclusive of applicable taxes.',
      },
      include: {
        paidBy: { select: { fullName: true, username: true } },
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        status: 'paid',
        updatedById: session.userId,
      },
      include: {
        items: true,
        table: true,
        createdBy: { select: { fullName: true } },
      },
    });

    return { payment, order: updatedOrder };
  });

  return NextResponse.json({
    success: true,
    payment: result.payment,
    order: result.order,
  });
}
