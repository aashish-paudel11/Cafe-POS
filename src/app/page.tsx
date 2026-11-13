import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import LoginPage from './login/page';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }

  let cafeName = process.env.CAFE_NAME || 'Cafe POS';
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: 'default' },
      select: { cafeName: true },
    });
    if (settings?.cafeName) {
      cafeName = settings.cafeName;
    }
  } catch {
    // Fall back to default
  }
  
  return <LoginPage initialCafeName={cafeName} />;
}
