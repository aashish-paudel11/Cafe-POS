import { NextResponse } from 'next/server';
import { checkAdminExists } from '@/lib/session';

export async function GET() {
  const exists = await checkAdminExists();
  return NextResponse.json({ needsSetup: !exists });
}
