import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import type { Script, ActualEffectRecord } from '../types';
import { electronStore, isElectron } from '../lib/electronStore';

interface ScriptState {
  scripts: Script[];
  selectedScriptId: string | null;
  saveScript: (script: Omit<Script, 'id' | 'createdAt'>) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  updateActualEffect: (id: string, actualEffect: ActualEffectRecord) => void;
  deleteScript: (id: string) => void;
  selectScript: (id: string | null) => void;
  getScriptById: (id: string) => Script | undefined;
  getScriptsByTheme: (theme: string) => Script[];
  getThemes: () => string[];
  exportScript: (id: string) => string;
  importScript: (jsonString: string) => void;
  syncFromElectron: () => Promise<void>;
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const useScriptStore = create<ScriptState>()(
  persist(
    (set, get) => ({
      scripts: [],
      selectedScriptId: null,

      saveScript: (scriptData) => {
        const newScript: Script = {
          ...scriptData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          scripts: [...state.scripts, newScript],
        }));
        
        if (isElectron) {
          electronStore.write('script-storage', { state: get(), version: 0 });
        }
      },

      updateScript: (id, updates) => {
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
        
        if (isElectron) {
          electronStore.write('script-storage', { state: get(), version: 0 });
        }
      },

      updateActualEffect: (id, actualEffect) => {
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, actualEffect, lastUsedAt: new Date().toISOString() } : s
          ),
        }));
        
        if (isElectron) {
          electronStore.write('script-storage', { state: get(), version: 0 });
        }
      },

      deleteScript: (id) => {
        set((state) => ({
          scripts: state.scripts.filter((s) => s.id !== id),
          selectedScriptId: state.selectedScriptId === id ? null : state.selectedScriptId,
        }));
        
        if (isElectron) {
          electronStore.write('script-storage', { state: get(), version: 0 });
        }
      },

      selectScript: (id) => {
        set({ selectedScriptId: id });
      },

      getScriptById: (id) => {
        return get().scripts.find((s) => s.id === id);
      },

      getScriptsByTheme: (theme) => {
        return get().scripts.filter((s) => s.theme === theme);
      },

      getThemes: () => {
        const themes = new Set(get().scripts.map((s) => s.theme));
        return Array.from(themes);
      },

      exportScript: (id) => {
        const script = get().scripts.find((s) => s.id === id);
        if (!script) throw new Error('Script not found');
        return JSON.stringify(script, null, 2);
      },

      importScript: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString) as Omit<Script, 'id' | 'createdAt'>;
          get().saveScript(parsed);
        } catch (e) {
          throw new Error('Invalid script format');
        }
      },

      syncFromElectron: async () => {
        if (!isElectron) return;
        
        const data = await electronStore.read('script-storage');
        if (data && data.state) {
          set(data.state);
        }
      },
    }),
    {
      name: 'script-storage',
    }
  )
);

if (typeof window !== 'undefined' && isElectron) {
  electronStore.read('script-storage').then((data) => {
    if (data && data.state) {
      useScriptStore.setState(data.state);
    }
  });
}
