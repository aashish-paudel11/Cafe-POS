import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: 'default' },
      select: {
        cafeName: true,
        logoUrl: true,
        currency: true,
      },
    });

    return NextResponse.json({
      cafeName: settings?.cafeName || process.env.CAFE_NAME || 'Cafe POS',
      logoUrl: settings?.logoUrl || '',
      currency: settings?.currency || 'NPR',
    });
  } catch {
    return NextResponse.json({
      cafeName: process.env.CAFE_NAME || 'Cafe POS',
      logoUrl: '',
      currency: 'NPR',
    });
  }
}
