import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Script } from '../types';

interface ScriptState {
  scripts: Script[];
  selectedScriptId: string | null;
  saveScript: (script: Omit<Script, 'id' | 'createdAt'>) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  selectScript: (id: string | null) => void;
  getScriptById: (id: string) => Script | undefined;
  getScriptsByTheme: (theme: string) => Script[];
  getThemes: () => string[];
  exportScript: (id: string) => string;
  importScript: (jsonString: string) => void;
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
      },

      updateScript: (id, updates) => {
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteScript: (id) => {
        set((state) => ({
          scripts: state.scripts.filter((s) => s.id !== id),
          selectedScriptId: state.selectedScriptId === id ? null : state.selectedScriptId,
        }));
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
    }),
    {
      name: 'script-storage',
    }
  )
);
