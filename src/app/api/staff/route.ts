import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const staff = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          createdOrders: true,
          payments: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });

  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, username, password, role } = body;

  if (!fullName || !username || !password) {
    return NextResponse.json({ error: 'Full name, username, and password are required' }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const normalizedUsername = username.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { username: normalizedUsername },
  });

  if (existing) {
    return NextResponse.json({ error: 'Username already in use' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      username: normalizedUsername,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'waiter', // default waiter
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { id, fullName, password, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName.trim();
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (password && password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json(updatedUser);
}
