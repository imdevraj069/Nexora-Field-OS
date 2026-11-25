'use client';

import React from 'react';
import { useAuthStore, UserSession, ActiveOrg } from '../stores/useAuthStore';

export type { UserSession, ActiveOrg };

export interface WorkspaceAuthCtx {
  token: string | null;
  user: UserSession | null;
  activeOrg: ActiveOrg | null;
  userOrgs: ActiveOrg[];
  isAuthenticated: boolean;
  isReady: boolean;
  login: (token: string, user: UserSession, activeOrg: ActiveOrg, allOrgs?: ActiveOrg[], refreshToken?: string | null) => void;
  switchOrg: (org: ActiveOrg) => void;
  logout: () => void;
}

export function useWorkspaceAuth(): WorkspaceAuthCtx {
  const store = useAuthStore();

  return {
    token: store.token,
    user: store.user,
    activeOrg: store.activeOrg,
    userOrgs: store.userOrgs,
    isAuthenticated: store.isAuthenticated,
    isReady: store.isHydrated,
    login: store.setAuth,
    switchOrg: store.switchOrg,
    logout: store.logout,
  };
}

export function WorkspaceAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
