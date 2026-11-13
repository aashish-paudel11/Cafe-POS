import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.businessSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      cafeName: 'My Cafe',
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
      receiptPaperSize: '80mm',
      receiptFooter: 'Thank you for visiting!',
      taxNote: 'All prices are inclusive of applicable taxes.',
    },
    update: {},
  });

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const {
    cafeName,
    businessName,
    address,
    contactNumber,
    email,
    panLabel,
    panNumber,
    currency,
    timezone,
    receiptPaperSize,
    receiptFooter,
    taxNote,
    logoUrl,
  } = body;

  const updatedSettings = await prisma.businessSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      cafeName: cafeName || 'My Cafe',
      businessName: businessName || '',
      address: address || '',
      contactNumber: contactNumber || '',
      email: email || '',
      panLabel: panLabel || 'PAN No.',
      panNumber: panNumber || '',
      currency: currency || 'NPR',
      timezone: timezone || 'Asia/Kathmandu',
      receiptPaperSize: receiptPaperSize || '80mm',
      receiptFooter: receiptFooter || 'Thank you for visiting!',
      taxNote: taxNote || 'All prices are inclusive of applicable taxes.',
      logoUrl: logoUrl || '',
    },
    update: {
      ...(cafeName !== undefined && { cafeName: cafeName.trim() }),
      ...(businessName !== undefined && { businessName: businessName.trim() }),
      ...(address !== undefined && { address: address.trim() }),
      ...(contactNumber !== undefined && { contactNumber: contactNumber.trim() }),
      ...(email !== undefined && { email: email.trim() }),
      ...(panLabel !== undefined && { panLabel: panLabel.trim() }),
      ...(panNumber !== undefined && { panNumber: panNumber.trim() }),
      ...(currency !== undefined && { currency: currency.trim() }),
      ...(timezone !== undefined && { timezone: timezone.trim() }),
      ...(receiptPaperSize !== undefined && { receiptPaperSize }),
      ...(receiptFooter !== undefined && { receiptFooter: receiptFooter.trim() }),
      ...(taxNote !== undefined && { taxNote: taxNote.trim() }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl.trim() }),
    },
  });

  return NextResponse.json(updatedSettings);
}
