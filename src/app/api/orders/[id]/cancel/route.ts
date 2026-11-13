import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

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
  const { reason } = body;

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json(
      { error: 'A cancellation reason is required.' },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'open') {
    return NextResponse.json(
      { error: `Cannot cancel an order that is already ${order.status}.` },
      { status: 400 }
    );
  }

  const cancelledOrder = await prisma.order.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancelReason: reason.trim(),
      cancelledById: session.userId,
      cancelledAt: new Date(),
      updatedById: session.userId,
    },
    include: {
      cancelledBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json({
    success: true,
    order: cancelledOrder,
  });
}
