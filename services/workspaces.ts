import { api } from '../lib/api';

export type WorkspacePrivacy = 'OPEN' | 'CLOSED';

export interface Workspace {
  id: string;
  name: string;
  privacy: WorkspacePrivacy;
  userId: string;
  createdAt: string;
  userRole?: 'OWNER' | 'MEMBER';
  _count?: { members: number; boards: number };
}

export const workspacesApi = {
  getAll: () => api.get<{ data: Workspace[] }>('/workspaces'),
  getOne: (id: string) => api.get<{ data: Workspace }>(`/workspaces/${id}`),
  create: (name: string, privacy: WorkspacePrivacy = 'OPEN') =>
    api.post<{ data: Workspace }>('/workspaces', { name, privacy }),
  update: (id: string, data: { name?: string; privacy?: WorkspacePrivacy }) =>
    api.patch<{ data: Workspace }>(`/workspaces/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/workspaces/${id}`),
};
