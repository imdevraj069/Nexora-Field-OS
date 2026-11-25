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
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.07] bg-[#0b0f1a] lg:static lg:translate-x-0 lg:z-auto"
        style={{ transform: undefined }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
          <NexoraMark className="h-7 w-7 text-emerald-400" />
          <div>
            <p className="font-display text-sm font-semibold text-white leading-tight">Nexora</p>
            <p className="text-[10px] font-mono text-emerald-400/70 tracking-widest uppercase">Platform Admin</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-slate-400 hover:text-white lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer
                  ${active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                  }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={16} className={active ? 'text-emerald-400 relative z-10' : 'relative z-10'} />
                <span className="relative z-10">{label}</span>
                {active && <ChevronRight size={12} className="ml-auto relative z-10 text-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.07] p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">devraj</p>
              <p className="text-[10px] font-mono text-emerald-400/70">PLATFORM_SUPERADMIN</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 cursor-pointer"
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

  // Build breadcrumb from pathname
  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Admin', href: '/admin/dashboard' }];
  let path = '/admin';
  for (const seg of segments) {
    path += `/${seg}`;
    // humanize segment
    const label = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    // skip UUIDs
    if (seg.length > 20 && !seg.includes('-')) continue;
    crumbs.push({ label, href: path });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-white/[0.07] bg-[#080a0f]/80 backdrop-blur-md px-4 lg:px-6">
      <button
        onClick={onMenuOpen}
        className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 && <ChevronRight size={12} className="shrink-0" />}
            {i === crumbs.length - 1 ? (
              <span className="text-slate-200 font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-slate-300 transition-colors cursor-pointer">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
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

  // Redirect logic after mount
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

  // Show login page without shell
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
      <div className="flex h-screen overflow-hidden bg-[#080a0f]">
        {/* Sidebar - desktop always visible */}
        <div className="hidden lg:flex">
          <AdminSidebar open={true} onClose={() => {}} />
        </div>
        {/* Sidebar - mobile drawer */}
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopBar onMenuOpen={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
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
