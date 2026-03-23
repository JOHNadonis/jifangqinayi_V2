import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  name?: string;
  role: 'ADMIN' | 'USER';
}

export interface CurrentProject {
  id: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

interface AuthState {
  token: string | null;
  user: User | null;
  currentProject: CurrentProject | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  setCurrentProject: (project: CurrentProject | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentProject: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      setCurrentProject: (project) => set({ currentProject: project }),
      logout: () => set({ token: null, user: null, currentProject: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
