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
  const { id, fullName, username, password, role, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const existingTarget = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingTarget) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updateData: Record<string, any> = {};

  if (fullName !== undefined) {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 });
    }
    updateData.fullName = trimmed;
  }

  if (username !== undefined) {
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    // Check if username is already taken by another user
    const conflict = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        NOT: { id },
      },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Username is already taken by another account' }, { status: 400 });
    }
    updateData.username = normalizedUsername;
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  if (role !== undefined && (role === 'admin' || role === 'waiter')) {
    updateData.role = role;
  }

  if (password !== undefined && password !== '') {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
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
      createdAt: true,
      _count: {
        select: {
          createdOrders: true,
          payments: true,
        },
      },
    },
  });

  return NextResponse.json(updatedUser);
}
