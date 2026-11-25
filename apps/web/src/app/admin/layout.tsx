'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { NexoraMark } from '../../components/svg/NexoraMark';

// ─── Auth context ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'nexora_superadmin_token';

interface AuthCtx {
  token: string;
  setToken: (t: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ token: '', setToken: () => {}, logout: () => {} });
export const useAdminAuth = () => useContext(AuthContext);

// ─── Nav items ───────────────────────────────────────────────────────────────
const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/organizations', label: 'Organizations', Icon: Building2 },
  { href: '/admin/users', label: 'Users', Icon: Users },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();

  const isActive = (href: string) =>
    href === '/admin/dashboard'
      ? pathname === '/admin/dashboard'
      : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-[#0c0c0e] lg:static lg:translate-x-0 lg:z-auto"
        style={{ transform: undefined }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner">
            <NexoraMark className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white leading-tight">Nexora</p>
            <p className="text-[10px] font-mono text-orange-400/80 tracking-widest uppercase">Field OS</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-zinc-400 hover:text-white lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer
                  ${active
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                  }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/15 via-orange-500/15 to-orange-500/5 border border-orange-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={17} className={active ? 'text-orange-400 relative z-10' : 'relative z-10 text-zinc-400 group-hover:text-zinc-200'} />
                <span className="relative z-10">{label}</span>
                {active && <ChevronRight size={13} className="ml-auto relative z-10 text-orange-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/30">
              <ShieldCheck size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">devraj</p>
              <p className="text-[10px] font-mono text-orange-400/80">SUPERADMIN</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-150 cursor-pointer"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Top bar ─────────────────────────────────────────────────────────────────
function TopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();

  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Admin', href: '/admin/dashboard' }];
  let path = '/admin';
  for (const seg of segments) {
    path += `/${seg}`;
    const label = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (seg.length > 20 && !seg.includes('-')) continue;
    crumbs.push({ label, href: path });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md px-4 lg:px-6">
      <button
        onClick={onMenuOpen}
        className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 && <ChevronRight size={12} className="shrink-0 text-zinc-600" />}
            {i === crumbs.length - 1 ? (
              <span className="text-zinc-200 font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-zinc-300 transition-colors cursor-pointer">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right side status indicator */}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-mono text-orange-300">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          SYSTEM ONLINE
        </span>
      </div>
    </header>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setTokenState] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const setToken = useCallback((t: string) => {
    setTokenState(t);
    if (typeof window !== 'undefined') {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setToken('');
    router.push('/admin');
  }, [setToken, router]);

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (saved) setTokenState(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const isLoginPage = pathname === '/admin';
    if (!token && !isLoginPage) {
      router.push('/admin');
    } else if (token && isLoginPage) {
      router.push('/admin/dashboard');
    }
  }, [mounted, token, pathname, router]);

  if (!mounted) return null;

  const isLoginPage = pathname === '/admin';
  if (isLoginPage) {
    return (
      <AuthContext.Provider value={{ token, setToken, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (!token) return null;

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      <div className="flex h-screen overflow-hidden bg-[#09090b]">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex">
          <AdminSidebar open={true} onClose={() => {}} />
        </div>
        {/* Mobile sidebar */}
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content canvas */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopBar onMenuOpen={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
