'use client';

import { create } from 'zustand';

interface DrawerState {
  isOpen: boolean;
  taskId: string | null;
  projectId: string | null;
  refreshTick: number;
  openTaskDrawer: (taskId: string, projectId?: string) => void;
  closeTaskDrawer: () => void;
  notifyDataChanged: () => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  taskId: null,
  projectId: null,
  refreshTick: 0,
  openTaskDrawer: (taskId, projectId) => set({ isOpen: true, taskId, projectId: projectId ?? null }),
  closeTaskDrawer: () => set({ isOpen: false }),
  notifyDataChanged: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
