'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../services/nexoraClient';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  isVerified: boolean;
}

export interface ActiveOrg {
  org_id: string;
  org_name: string;
  role_id: string;
  role_name?: string;
  shard_id: number;
}

export interface WorkspaceAuthCtx {
  token: string;
  user: UserSession | null;
  activeOrg: ActiveOrg | null;
  userOrgs: ActiveOrg[];
  isReady: boolean;
  login: (token: string, user: UserSession, activeOrg: ActiveOrg, allOrgs?: ActiveOrg[]) => void;
  switchOrg: (org: ActiveOrg) => void;
  logout: () => void;
}

const SESSION_TOKEN_KEY = 'nexora_session_token';
const USER_KEY = 'nexora_session_user';
const ACTIVE_ORG_KEY = 'nexora_session_org';
const ALL_ORGS_KEY = 'nexora_session_user_orgs';

const WorkspaceAuthContext = createContext<WorkspaceAuthCtx>({
  token: '',
  user: null,
  activeOrg: null,
  userOrgs: [],
  isReady: false,
  login: () => {},
  switchOrg: () => {},
  logout: () => {},
});

export const useWorkspaceAuth = () => useContext(WorkspaceAuthContext);

export function WorkspaceAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(null);
  const [userOrgs, setUserOrgs] = useState<ActiveOrg[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
      const savedUser = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      const savedOrg = sessionStorage.getItem(ACTIVE_ORG_KEY) || localStorage.getItem(ACTIVE_ORG_KEY);
      const savedAllOrgs = sessionStorage.getItem(ALL_ORGS_KEY) || localStorage.getItem(ALL_ORGS_KEY);

      if (savedToken && savedUser && savedOrg) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setActiveOrg(JSON.parse(savedOrg));
        if (savedAllOrgs) setUserOrgs(JSON.parse(savedAllOrgs));
      }
    } catch (e) {
      console.error('Session hydration failed', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: UserSession, newOrg: ActiveOrg, allOrgs: ActiveOrg[] = [newOrg]) => {
    setToken(newToken);
    setUser(newUser);
    setActiveOrg(newOrg);
    setUserOrgs(allOrgs);

    sessionStorage.setItem(SESSION_TOKEN_KEY, newToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    sessionStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(newOrg));
    sessionStorage.setItem(ALL_ORGS_KEY, JSON.stringify(allOrgs));
  }, []);

  const switchOrg = useCallback((org: ActiveOrg) => {
    setActiveOrg(org);
    sessionStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(org));
    window.location.reload();
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setActiveOrg(null);
    setUserOrgs([]);

    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ACTIVE_ORG_KEY);
    sessionStorage.removeItem(ALL_ORGS_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_ORG_KEY);
    localStorage.removeItem(ALL_ORGS_KEY);

    router.push('/login');
  }, [router]);

  return (
    <WorkspaceAuthContext.Provider
      value={{
        token,
        user,
        activeOrg,
        userOrgs,
        isReady,
        login,
        switchOrg,
        logout,
      }}
    >
      {children}
    </WorkspaceAuthContext.Provider>
  );
}

export function getStoredWorkspaceToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

export function getStoredActiveOrg(): ActiveOrg | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(ACTIVE_ORG_KEY) || localStorage.getItem(ACTIVE_ORG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
