import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Firework } from '../types';
import { electronStore, isElectron } from '../lib/electronStore';

interface FireworkState {
  fireworks: Firework[];
  selectedFireworkId: string | null;
  addFirework: (firework: Omit<Firework, 'id' | 'createdAt'>) => void;
  updateFirework: (id: string, updates: Partial<Firework>) => void;
  deleteFirework: (id: string) => void;
  selectFirework: (id: string | null) => void;
  getFireworkById: (id: string) => Firework | undefined;
  getFireworkMap: () => Map<string, Firework>;
  bulkImport: (fireworks: Omit<Firework, 'id' | 'createdAt'>[]) => void;
  syncFromElectron: () => Promise<void>;
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const useFireworkStore = create<FireworkState>()(
  persist(
    (set, get) => ({
      fireworks: [],
      selectedFireworkId: null,

      addFirework: (fireworkData) => {
        const newFirework: Firework = {
          ...fireworkData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          fireworks: [...state.fireworks, newFirework],
        }));
        
        if (isElectron) {
          electronStore.write('firework-storage', { state: get(), version: 0 });
        }
      },

      updateFirework: (id, updates) => {
        set((state) => ({
          fireworks: state.fireworks.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
        
        if (isElectron) {
          electronStore.write('firework-storage', { state: get(), version: 0 });
        }
      },

      deleteFirework: (id) => {
        set((state) => ({
          fireworks: state.fireworks.filter((f) => f.id !== id),
          selectedFireworkId: state.selectedFireworkId === id ? null : state.selectedFireworkId,
        }));
        
        if (isElectron) {
          electronStore.write('firework-storage', { state: get(), version: 0 });
        }
      },

      selectFirework: (id) => {
        set({ selectedFireworkId: id });
      },

      getFireworkById: (id) => {
        return get().fireworks.find((f) => f.id === id);
      },

      getFireworkMap: () => {
        const map = new Map<string, Firework>();
        get().fireworks.forEach((f) => map.set(f.id, f));
        return map;
      },

      bulkImport: (fireworksData) => {
        const newFireworks: Firework[] = fireworksData.map((data) => ({
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }));
        set((state) => ({
          fireworks: [...state.fireworks, ...newFireworks],
        }));
        
        if (isElectron) {
          electronStore.write('firework-storage', { state: get(), version: 0 });
        }
      },

      syncFromElectron: async () => {
        if (!isElectron) return;
        
        const data = await electronStore.read('firework-storage');
        if (data && data.state) {
          set(data.state);
        }
      },
    }),
    {
      name: 'firework-storage',
    }
  )
);

if (typeof window !== 'undefined' && isElectron) {
  electronStore.read('firework-storage').then((data) => {
    if (data && data.state) {
      useFireworkStore.setState(data.state);
    }
  });
}
