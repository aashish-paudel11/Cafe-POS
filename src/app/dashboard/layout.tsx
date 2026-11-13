'use client';

import { useState, useEffect, ReactNode, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Coffee, LayoutDashboard, Grid3X3, ClipboardList, UtensilsCrossed,
  Receipt, History, BarChart3, Users, Settings, LogOut, Menu, X,
  Loader2, User as UserIcon
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Tables', href: '/dashboard/tables', icon: <Grid3X3 className="w-5 h-5" /> },
  { label: 'Orders', href: '/dashboard/orders', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Menu', href: '/dashboard/menu', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { label: 'Billing & Sales', href: '/dashboard/billing', icon: <Receipt className="w-5 h-5" /> },
  { label: 'Order History', href: '/dashboard/history', icon: <History className="w-5 h-5" /> },
  { label: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Staff', href: '/dashboard/staff', icon: <Users className="w-5 h-5" /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  { label: 'Account', href: '/dashboard/account', icon: <UserIcon className="w-5 h-5" /> },
];

const waiterNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Tables', href: '/dashboard/tables', icon: <Grid3X3 className="w-5 h-5" /> },
  { label: 'Active Orders', href: '/dashboard/orders', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Order History', href: '/dashboard/history', icon: <History className="w-5 h-5" /> },
  { label: 'Account', href: '/dashboard/account', icon: <UserIcon className="w-5 h-5" /> },
];

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/tables': 'Tables',
    '/dashboard/orders': 'Orders',
    '/dashboard/menu': 'Menu Management',
    '/dashboard/billing': 'Billing & Sales',
    '/dashboard/history': 'Order History',
    '/dashboard/reports': 'Reports',
    '/dashboard/staff': 'Staff Management',
    '/dashboard/settings': 'Settings',
    '/dashboard/account': 'My Account',
  };
  if (pathname.startsWith('/dashboard/orders/')) return 'Order Details';
  if (pathname.startsWith('/dashboard/tables/')) return 'Table';
  return map[pathname] || 'Dashboard';
}

interface SessionUser {
  userId: string;
  username: string;
  fullName: string;
  role: 'admin' | 'waiter';
  isLoggedIn: boolean;
}

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cafeName, setCafeName] = useState('Cafe POS');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/settings/public')
      .then((r) => r.json())
      .then((d) => {
        if (d.cafeName) setCafeName(d.cafeName);
      })
      .catch(() => {});

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) {
          router.replace('/login');
        } else {
          setUser(data);
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8EB]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
      </div>
    );
  }

  const nav = user.role === 'admin' ? adminNav : waiterNav;
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#FFF8EB] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E8DCC8] flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E8DCC8]">
          <div className="w-9 h-9 rounded-lg bg-[#E5AE45] flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold text-[#3C2A20] truncate max-w-[145px]" title={cafeName}>
            {cafeName}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-[#8B7355] hover:text-[#3C2A20]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#FFF8EB] text-[#E5AE45] border-l-4 border-[#E5AE45]'
                    : 'text-[#8B7355] hover:bg-[#FFF8EB] hover:text-[#3C2A20]'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-[#E8DCC8] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#F2E8D5] flex items-center justify-center text-sm font-semibold text-[#3C2A20]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#3C2A20] truncate">{user.fullName}</p>
              <p className="text-xs text-[#8B7355] capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8B7355] hover:text-[#C44536] hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E8DCC8] px-4 lg:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#8B7355] hover:text-[#3C2A20]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-[#3C2A20]">{getPageTitle(pathname)}</h1>
          <div className="ml-auto flex items-center gap-2 text-sm text-[#8B7355]">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{user.fullName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFF8EB]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5AE45]" />
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
