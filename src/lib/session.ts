import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, defaultSession } from './auth';
import { prisma } from './db';

export async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) {
    return defaultSession;
  }
  return {
    userId: session.userId || '',
    username: session.username || '',
    fullName: session.fullName || '',
    role: session.role || 'waiter',
    isLoggedIn: true,
  };
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

export async function setSession(data: Omit<SessionData, 'isLoggedIn'>): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId = data.userId;
  session.username = data.username;
  session.fullName = data.fullName;
  session.role = data.role;
  session.isLoggedIn = true;
  await session.save();
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
}

export async function checkAdminExists(): Promise<boolean> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
  });
  return !!admin;
}
