import { prisma } from './db';

let counter = 0;

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of orders today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const count = await prisma.order.count({
    where: {
      createdAt: { gte: todayStart }
    }
  });
  
  const seq = String(count + 1).padStart(3, '0');
  return `ORD-${dateStr}-${seq}`;
}

export async function generateReceiptNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const count = await prisma.payment.count({
    where: {
      paidAt: { gte: todayStart }
    }
  });
  
  const seq = String(count + 1).padStart(3, '0');
  return `RCP-${dateStr}-${seq}`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kathmandu',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kathmandu',
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getToday(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}
