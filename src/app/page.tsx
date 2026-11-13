import { redirect } from 'next/navigation';
import { getSession, checkAdminExists } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }
  
  const adminExists = await checkAdminExists();
  if (!adminExists) {
    redirect('/setup');
  }
  
  redirect('/login');
}
