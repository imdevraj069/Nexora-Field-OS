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

export interface AuthState {
  token: string | null;
  user: UserSession | null;
  activeOrg: ActiveOrg | null;
  userOrgs: ActiveOrg[];
  isAuthenticated: boolean;
  isHydrated: boolean;

  setAuth: (token: string, user: UserSession, activeOrg: ActiveOrg, userOrgs?: ActiveOrg[]) => void;
  switchOrg: (org: ActiveOrg) => void;
  logout: () => void;
  setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeOrg: null,
      userOrgs: [],
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (token, user, activeOrg, userOrgs = [activeOrg]) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('nexora_session_token', token);
          localStorage.setItem('nexora_session_token', token);
        }
        set({
          token,
          user,
          activeOrg,
          userOrgs,
          isAuthenticated: true,
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
          user: null,
          activeOrg: null,
          userOrgs: [],
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
