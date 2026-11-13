import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;
  username: string;
  fullName: string;
  role: 'admin' | 'waiter';
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  userId: '',
  username: '',
  fullName: '',
  role: 'waiter',
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'cafe-pos-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  },
};
