'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Plus,
  Sparkles,
  Download,
} from 'lucide-react';
import { NexoraMark } from '@/components/svg/NexoraMark';
import { WorkspaceAuthProvider, useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Operations', Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects & Stages', Icon: FolderKanban },
  { href: '/tasks', label: 'Field Tasks', Icon: CheckSquare },
  { href: '/team', label: 'Team & Roles', Icon: Users },
];

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrg, userOrgs, switchOrg, logout, isReady, token } = useWorkspaceAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Auth gate
  React.useEffect(() => {
    if (isReady && !token) {
      router.push('/login');
    }
  }, [isReady, token, router]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-[#0c0c0e] transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner">
            <NexoraMark className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white leading-tight">Nexora</p>
            <p className="text-[10px] font-mono text-orange-400/80 tracking-widest uppercase font-semibold">Tenant Field OS</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1 text-zinc-400 hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Active Organization Switcher */}
        <div className="p-3 border-b border-white/[0.06] relative">
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121215] p-2.5 hover:border-orange-500/30 transition-all text-left cursor-pointer"
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/20 text-[11px] font-bold text-orange-400">
                {activeOrg?.org_name?.slice(0, 2).toUpperCase() || 'OR'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{activeOrg?.org_name || 'Active Tenant'}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate">Shard S{activeOrg?.shard_id || 1}</p>
              </div>
            </div>
            <ChevronRight size={14} className={`text-zinc-500 transition-transform ${showOrgDropdown ? 'rotate-90' : ''}`} />
          </button>

          {/* Org dropdown */}
          <AnimatePresence>
            {showOrgDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-white/[0.08] bg-[#18181b] p-1.5 shadow-xl"
              >
                <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Associated Tenants
                </div>
                {userOrgs.map((org) => (
                  <button
                    key={org.org_id}
                    onClick={() => {
                      switchOrg(org);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                      org.org_id === activeOrg?.org_id ? 'bg-orange-500/15 text-orange-300 font-semibold' : 'text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate">{org.org_name}</span>
                    <span className="font-mono text-[10px] text-zinc-500">S{org.shard_id}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  active ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="workspace-sidebar-active"
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

        {/* User profile & footer */}
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-white/[0.08] text-xs font-semibold text-zinc-200">
              {user?.fullName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.fullName || 'Field User'}</p>
              <p className="text-[10px] font-mono text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/[0.08] transition-all cursor-pointer"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md px-4 lg:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SHARD_ID: {activeOrg?.shard_id || 1}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-orange-400">{activeOrg?.org_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceAuthProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceAuthProvider>
  );
}
