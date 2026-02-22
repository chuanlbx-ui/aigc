import { create } from 'zustand';
import { api } from '../api/client';

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/projects');
      console.log('获取项目列表:', res.data);
      set({ projects: res.data });
    } catch (error) {
      console.error('获取项目列表失败:', error);
      set({ projects: [] });
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },
}));
