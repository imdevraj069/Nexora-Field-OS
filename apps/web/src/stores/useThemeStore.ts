'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeToDom(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
        applyThemeToDom(next);
        set({ theme: next });
      },
    }),
    {
      name: 'nexora_theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDom(state.theme);
      },
    }
  )
);
