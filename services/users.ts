import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getMe: () => api.get<User>('/users/me'),
  update: (id: string, data: { name?: string; role?: 'USER' | 'ADMIN' }) =>
    api.patch<User>(`/users/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
  invite: (email: string, name?: string) =>
    api.post<{ data: User; message: string }>('/users/invite', { email, name }),
};
