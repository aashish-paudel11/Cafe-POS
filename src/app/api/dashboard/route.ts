import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getToday, getDateRange } from '@/lib/helpers';
import { calculateOrderTotal } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { start: todayStart, end: todayEnd } = getToday();

  // Active physical tables
  const tables = await prisma.cafeTable.findMany({ where: { isActive: true } });
  const openOrders = await prisma.order.findMany({
    where: { status: 'open' },
    select: { tableId: true },
  });
  const occupiedTableIds = openOrders.map((o) => o.tableId);

  // Recent orders
  const recentOrders = await prisma.order.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      table: true,
      createdBy: { select: { fullName: true } },
      items: true,
    },
  });

  const formattedRecentOrders = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    tableName: o.tableName,
    status: o.status,
    total: calculateOrderTotal(o.items),
    itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
    createdBy: o.createdBy.fullName,
    createdAt: o.createdAt,
  }));

  // If user is a Waiter, return operational floor data without sensitive financial statistics
  if (session.role !== 'admin') {
    return NextResponse.json({
      role: 'waiter',
      totalTables: tables.length,
      availableTables: tables.length - occupiedTableIds.length,
      occupiedTables: occupiedTableIds.length,
      activeOrdersCount: occupiedTableIds.length,
      recentOrders: formattedRecentOrders,
    });
  }

  // Admin Data: Calculate today's paid sales
  const todayPayments = await prisma.payment.findMany({
    where: { paidAt: { gte: todayStart, lte: todayEnd } },
  });
  const todaySales = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const todayOrderCount = todayPayments.length;

  // Best selling items (last 30 days)
  const { start: thirtyDaysAgo } = getDateRange(30);
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { status: 'paid', createdAt: { gte: thirtyDaysAgo } },
    },
    select: { itemName: true, quantity: true },
  });
  const itemSales: Record<string, number> = {};
  orderItems.forEach((oi) => {
    itemSales[oi.itemName] = (itemSales[oi.itemName] || 0) + oi.quantity;
  });
  const bestSelling = Object.entries(itemSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, quantity: qty }));

  // Last 7 days sales for chart
  const dailySales: { date: string; sales: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const payments = await prisma.payment.findMany({
      where: { paidAt: { gte: dayStart, lte: dayEnd } },
    });
    dailySales.push({
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      sales: payments.reduce((s, p) => s + p.amount, 0),
    });
  }

  return NextResponse.json({
    role: 'admin',
    totalTables: tables.length,
    availableTables: tables.length - occupiedTableIds.length,
    occupiedTables: occupiedTableIds.length,
    todaySales,
    todayOrderCount,
    recentOrders: formattedRecentOrders,
    bestSelling,
    dailySales,
  });
}
