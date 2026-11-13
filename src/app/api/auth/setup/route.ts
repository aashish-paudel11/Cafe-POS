import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (existingAdmin) {
      return NextResponse.json({ error: 'Setup already completed.' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, username, password, confirmPassword, businessName } = body;

    if (!fullName || !username || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          fullName,
          username: username.toLowerCase(),
          passwordHash,
          role: 'admin',
        },
      });

      await tx.businessSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          cafeName: businessName || 'My Cafe',
        },
        update: {
          cafeName: businessName || 'My Cafe',
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup failed.';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Setup failed. Please try again.' }, { status: 500 });
  }
}
