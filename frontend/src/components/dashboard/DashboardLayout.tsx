'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Video, BookOpen, User, Settings,
  Zap, Coins, Bell, LogOut, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/skills', icon: BookOpen, label: 'Browse Skills' },
  { href: '/sessions', icon: Video, label: 'My Sessions' },
  { href: '/credits', icon: Coins, label: 'Credits' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-cyan-500/10 bg-slate-950/50 flex flex-col fixed top-0 bottom-0 left-0 z-30">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-cyan-500/10">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-slate-900" />
          </div>
          <span className="text-xl font-bold text-gradient-cyan">SkillSwap</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={cn('w-4 h-4', active ? 'text-cyan-400' : '')} />
                {item.label}
              </Link>
            );
          })}

          {user?.role !== 'USER' && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                pathname.startsWith('/admin')
                  ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* User profile section */}
        <div className="border-t border-cyan-500/10 p-3">
          {/* Credits */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-2">
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <Coins className="w-4 h-4" />
              <span>{user?.credits ?? 0} credits</span>
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 px-3 py-2">
            <Link href={`/profile/${user?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                {user?.avatar
                  ? <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                  : <span className="text-xs font-bold text-cyan-400">{user?.name?.[0]}</span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
