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
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { NexoraMark } from '@/components/svg/NexoraMark';
import { WorkspaceAuthProvider, useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useAuthStore, WorkflowStatusDef } from '@/stores/useAuthStore';
import { apiRequest } from '@/services/nexoraClient';
import { TaskDetailDrawer } from '@/components/drawers/TaskDetailDrawer';
import { MARLO_EASE } from '@/components/ui/motion';

const NAV_GROUPS = [
  {
    group: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
      { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
    ],
  },
  {
    group: 'Organization',
    items: [{ href: '/team', label: 'Team & RBAC', Icon: Users }],
  },
];

const MOBILE_TABS = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/team', label: 'Team', Icon: Users },
];

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrg, userOrgs, switchOrg, logout, isReady, token } = useWorkspaceAuth();
  const { setContext } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railMode, setRailMode] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  React.useEffect(() => {
    if (isReady && !token) {
      router.push('/login');
    }
  }, [isReady, token, router]);

  React.useEffect(() => {
    if (!token || !activeOrg) return;
    apiRequest<{
      roleName: string;
      flags: Record<string, boolean>;
      defaultWorkflowStatuses: WorkflowStatusDef[];
    }>('/api/v1/org/my-context', {}, token)
      .then((ctx) => setContext(ctx.roleName, ctx.flags, ctx.defaultWorkflowStatuses))
      .catch(() => {});
  }, [token, activeOrg, setContext]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      {/* Mobile Drawer Backdrop */}
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

      {/* Marlo Floating Rounded Sidebar */}
      <aside
        className={`fixed top-3 bottom-3 left-3 z-50 flex flex-col rounded-[28px] border border-white/[0.07] bg-[#121215]/95 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] lg:m-4 lg:mr-0 lg:translate-x-0 ${
          railMode ? 'w-[76px]' : 'w-[244px]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}
      >
        {/* Brand + Fold Toggle */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner">
              <NexoraMark className="h-5 w-5 text-orange-400" />
            </div>
            {!railMode && (
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-white leading-tight truncate">Nexora</p>
                <p className="text-[10px] font-mono text-orange-400/80 tracking-widest uppercase font-semibold">
                  Field OS
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setRailMode(!railMode)}
            className="hidden lg:grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            title={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {railMode ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Active Organization Switcher */}
        <div className="px-3 py-3 border-b border-white/[0.06] relative">
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className={`w-full flex items-center ${railMode ? 'justify-center' : 'justify-between'} rounded-2xl border border-white/[0.06] bg-[#18181c] p-2 hover:border-orange-500/35 transition-all text-left cursor-pointer`}
            title={activeOrg?.org_name}
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/25 to-orange-500/20 border border-orange-500/30 text-[11px] font-bold text-orange-300">
                {activeOrg?.org_name?.slice(0, 2).toUpperCase() || 'NX'}
              </div>
              {!railMode && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{activeOrg?.org_name || 'Workspace'}</p>
                  <p className="text-[10px] font-mono text-zinc-500 truncate">
                    {activeOrg?.org_id} · S{activeOrg?.shard_id || 1}
                  </p>
                </div>
              )}
            </div>
            {!railMode && (
              <ChevronRight size={14} className={`text-zinc-500 transition-transform ${showOrgDropdown ? 'rotate-90' : ''}`} />
            )}
          </button>

          <AnimatePresence>
            {showOrgDropdown && !railMode && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18, ease: MARLO_EASE }}
                className="absolute left-3 right-3 top-full mt-1 z-50 rounded-2xl border border-white/[0.08] bg-[#1b1b20] p-1.5 shadow-2xl"
              >
                <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Tenants
                </div>
                {userOrgs.map((org) => (
                  <button
                    key={org.org_id}
                    onClick={() => {
                      switchOrg(org);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                      org.org_id === activeOrg?.org_id
                        ? 'bg-orange-500/15 text-orange-300 font-semibold'
                        : 'text-zinc-300 hover:bg-white/[0.04]'
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

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.group}>
              {!railMode ? (
                <span className="block px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  {grp.group}
                </span>
              ) : (
                <div className="mx-3 my-2 h-px bg-white/[0.07]" />
              )}
              <div className="space-y-1">
                {grp.items.map(({ href, label, Icon }) => {
                  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      title={railMode ? label : undefined}
                      className={`group relative flex items-center ${railMode ? 'justify-center px-2' : 'gap-3 px-3.5'} rounded-2xl py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        active ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="marlo-nav-pill"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600/20 via-orange-500/20 to-orange-500/5 border border-orange-500/35 shadow-sm"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <Icon
                        size={17}
                        className={`relative z-10 shrink-0 ${
                          active ? 'text-orange-400' : 'text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      />
                      {!railMode && <span className="relative z-10">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Status Pill & User */}
        <div className="border-t border-white/[0.06] p-3 space-y-2.5">
          {!railMode && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#18181c] px-3 py-1.5 text-[11px] font-mono text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Shard S{activeOrg?.shard_id || 1} Live</span>
              <Zap size={11} className="ml-auto text-orange-400" />
            </div>
          )}

          <div className={`flex items-center ${railMode ? 'justify-center' : 'gap-2.5 px-1'}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-white/[0.08] text-xs font-semibold text-zinc-200">
              {user?.fullName?.[0]?.toUpperCase() || 'U'}
            </div>
            {!railMode && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.fullName || 'User'}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate">{user?.email}</p>
              </div>
            )}
            {!railMode && (
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-6">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:px-8 pt-2 bg-[#09090b]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-white/[0.08] bg-[#121215] p-2 text-zinc-400 hover:text-white lg:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="text-zinc-300 font-semibold">{activeOrg?.org_name}</span>
              <span>/</span>
              <span className="text-orange-400 capitalize">{pathname.split('/').filter(Boolean)[0] || 'overview'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="rounded-full border border-white/[0.07] bg-[#121215] px-3 py-1 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
            >
              Admin Console
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {children}
        </main>
      </div>

      {/* Marlo Mobile Floating Bottom Tabbar */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 grid grid-cols-4 gap-1 rounded-[24px] border border-white/[0.08] bg-[#141417]/95 p-1.5 shadow-2xl backdrop-blur-xl">
        {MOBILE_TABS.map(({ href, label, Icon }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center py-2 rounded-2xl text-[10px] font-semibold transition-colors ${
                active ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="marlo-tab-pill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600/25 to-orange-500/25 border border-orange-500/35"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={16} className={`relative z-10 ${active ? 'text-orange-400' : ''}`} />
              <span className="relative z-10 mt-0.5">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Slide-Over Task Detail Drawer */}
      <TaskDetailDrawer />
    </div>
  );
}

export default function AppWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceAuthProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceAuthProvider>
  );
}
