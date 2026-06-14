import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesignProject, LaunchPoint, TimelineSegment, LaunchCommand } from '../types';

interface ProjectState {
  projects: DesignProject[];
  activeProjectId: string | null;
  launchScript: LaunchCommand[];
  launchPoints: LaunchPoint[];
  createProject: (name: string, theme: string, description: string) => void;
  updateProject: (id: string, updates: Partial<DesignProject>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => DesignProject | undefined;
  setLaunchPoints: (points: LaunchPoint[]) => void;
  addLaunchPoints: (points: LaunchPoint[]) => void;
  updateLaunchPoint: (id: string, updates: Partial<LaunchPoint>) => void;
  setTimelineSegments: (segments: TimelineSegment[]) => void;
  updateTimelineSegment: (id: string, updates: Partial<TimelineSegment>) => void;
  setLaunchScript: (script: LaunchCommand[]) => void;
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      launchScript: [],
      launchPoints: [],

      createProject: (name, theme, description) => {
        const newProject: DesignProject = {
          id: generateId(),
          name,
          theme,
          description,
          totalDuration: 0,
          launchPoints: [],
          timelineSegments: [],
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id,
        }));
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
      },

      setActiveProject: (id) => {
        const state = get();
        const project = state.projects.find((p) => p.id === id);
        set({ 
          activeProjectId: id,
          launchPoints: project?.launchPoints || [],
        });
      },

      getActiveProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.activeProjectId);
      },

      setLaunchPoints: (points) => {
        const activeId = get().activeProjectId;
        if (!activeId) return;

        set((state) => ({
          launchPoints: points,
          projects: state.projects.map((p) =>
            p.id === activeId
              ? {
                  ...p,
                  launchPoints: points,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      addLaunchPoints: (points) => {
        const activeId = get().activeProjectId;
        if (!activeId) return;

        set((state) => {
          const newLaunchPoints = [...state.launchPoints, ...points];
          return {
            launchPoints: newLaunchPoints,
            projects: state.projects.map((p) =>
              p.id === activeId
                ? {
                    ...p,
                    launchPoints: [...p.launchPoints, ...points],
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          };
        });
      },

      updateLaunchPoint: (id, updates) => {
        const activeId = get().activeProjectId;
        if (!activeId) return;

        set((state) => {
          const newLaunchPoints = state.launchPoints.map((lp) =>
            lp.id === id ? { ...lp, ...updates } : lp
          );
          return {
            launchPoints: newLaunchPoints,
            projects: state.projects.map((p) =>
              p.id === activeId
                ? {
                    ...p,
                    launchPoints: p.launchPoints.map((lp) =>
                      lp.id === id ? { ...lp, ...updates } : lp
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          };
        });
      },

      setTimelineSegments: (segments) => {
        const activeId = get().activeProjectId;
        if (!activeId) return;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === activeId
              ? {
                  ...p,
                  timelineSegments: segments,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateTimelineSegment: (id, updates) => {
        const activeId = get().activeProjectId;
        if (!activeId) return;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === activeId
              ? {
                  ...p,
                  timelineSegments: p.timelineSegments.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      setLaunchScript: (script) => {
        set({ launchScript: script });
      },
    }),
    {
      name: 'project-storage',
    }
  )
);
