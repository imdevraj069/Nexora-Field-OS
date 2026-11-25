'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
}

export interface ActiveOrg {
  org_id: string;
  org_name: string;
  role_id: string;
  role_name?: string;
  shard_id: number;
}

export interface WorkflowStatusDef {
  key: string;
  label: string;
  color: string;
  category: 'OPEN' | 'ACTIVE' | 'DONE';
  order: number;
}

export const DEFAULT_STATUSES: WorkflowStatusDef[] = [
  { key: 'TODO', label: 'To Do', color: '#71717a', category: 'OPEN', order: 1 },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b', category: 'ACTIVE', order: 2 },
  { key: 'IN_REVIEW', label: 'In Review', color: '#f97316', category: 'ACTIVE', order: 3 },
  { key: 'DONE', label: 'Done', color: '#10b981', category: 'DONE', order: 4 },
];

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserSession | null;
  activeOrg: ActiveOrg | null;
  userOrgs: ActiveOrg[];
  permissions: Record<string, boolean>;
  roleName: string;
  defaultWorkflowStatuses: WorkflowStatusDef[];
  isAuthenticated: boolean;
  isHydrated: boolean;

  setAuth: (token: string, user: UserSession, activeOrg: ActiveOrg, userOrgs?: ActiveOrg[], refreshToken?: string | null) => void;
  setTokens: (token: string, refreshToken?: string | null) => void;
  setContext: (roleName: string, permissions: Record<string, boolean>, statuses: WorkflowStatusDef[]) => void;
  switchOrg: (org: ActiveOrg) => void;
  logout: () => void;
  setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      activeOrg: null,
      userOrgs: [],
      permissions: {},
      roleName: '',
      defaultWorkflowStatuses: DEFAULT_STATUSES,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (token, user, activeOrg, userOrgs = [activeOrg], refreshToken = null) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('nexora_session_token', token);
          localStorage.setItem('nexora_session_token', token);
        }
        set({
          token,
          refreshToken: refreshToken ?? get().refreshToken,
          user,
          activeOrg,
          userOrgs,
          isAuthenticated: true,
        });
      },

      setTokens: (token, refreshToken) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('nexora_session_token', token);
          localStorage.setItem('nexora_session_token', token);
        }
        set({
          token,
          refreshToken: refreshToken !== undefined ? refreshToken : get().refreshToken,
          isAuthenticated: true,
        });
      },

      setContext: (roleName, permissions, statuses) => {
        set({
          roleName,
          permissions,
          defaultWorkflowStatuses: statuses?.length ? statuses : DEFAULT_STATUSES,
        });
      },

      switchOrg: (org) => {
        set({ activeOrg: org });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('nexora_session_token');
          localStorage.removeItem('nexora_session_token');
        }
        set({
          token: null,
          refreshToken: null,
          user: null,
          activeOrg: null,
          userOrgs: [],
          permissions: {},
          roleName: '',
          isAuthenticated: false,
        });
      },

      setHydrated: (val) => set({ isHydrated: val }),
    }),
    {
      name: 'nexora_auth_store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
