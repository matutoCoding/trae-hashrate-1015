import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Firework } from '../types';

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
      },

      updateFirework: (id, updates) => {
        set((state) => ({
          fireworks: state.fireworks.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },

      deleteFirework: (id) => {
        set((state) => ({
          fireworks: state.fireworks.filter((f) => f.id !== id),
          selectedFireworkId: state.selectedFireworkId === id ? null : state.selectedFireworkId,
        }));
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
      },
    }),
    {
      name: 'firework-storage',
    }
  )
);
