import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'today'; // today, week, month, custom
  const customStart = searchParams.get('startDate');
  const customEnd = searchParams.get('endDate');

  let startDate = new Date();
  let endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  }

  // 1. Fetch all completed payments in date range
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      order: {
        include: {
          items: true,
          table: true,
        },
      },
      paidBy: { select: { fullName: true } },
    },
    orderBy: { paidAt: 'desc' },
  });

  const totalSales = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidOrdersCount = payments.length;

  // 2. Sales by payment method
  const salesByMethod: Record<string, { count: number; total: number }> = {
    cash: { count: 0, total: 0 },
    qr: { count: 0, total: 0 },
    card: { count: 0, total: 0 },
    other: { count: 0, total: 0 },
  };

  payments.forEach((p) => {
    const m = p.method.toLowerCase();
    if (!salesByMethod[m]) {
      salesByMethod[m] = { count: 0, total: 0 };
    }
    salesByMethod[m].count += 1;
    salesByMethod[m].total += p.amount;
  });

  // 3. Best selling items
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  payments.forEach((p) => {
    p.order.items.forEach((item) => {
      if (!itemMap[item.itemName]) {
        itemMap[item.itemName] = { name: item.itemName, quantity: 0, revenue: 0 };
      }
      itemMap[item.itemName].quantity += item.quantity;
      itemMap[item.itemName].revenue += item.quantity * item.unitPrice;
    });
  });

  const bestSellingItems = Object.values(itemMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // 4. Daily timeline data for charts/tables
  const timelineMap: Record<string, number> = {};
  payments.forEach((p) => {
    const dayStr = p.paidAt.toISOString().slice(0, 10);
    timelineMap[dayStr] = (timelineMap[dayStr] || 0) + p.amount;
  });

  const timeline = Object.entries(timelineMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }));

  // 5. Payment details list for CSV export
  const exportRows = payments.map((p) => ({
    receiptNumber: p.receiptNumber,
    orderNumber: p.order.orderNumber,
    tableName: p.order.tableName,
    paidAt: p.paidAt.toISOString(),
    method: p.method,
    amount: p.amount,
    settledBy: p.paidBy.fullName,
    itemCount: p.order.items.reduce((acc, i) => acc + i.quantity, 0),
  }));

  return NextResponse.json({
    totalSales,
    paidOrdersCount,
    salesByMethod,
    bestSellingItems,
    timeline,
    exportRows,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}
