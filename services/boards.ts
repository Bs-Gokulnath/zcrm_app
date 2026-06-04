import { api } from '../lib/api';

export type BoardType = 'NORMAL' | 'MULTI_LEVEL';
export type MemberRole = 'VIEWER' | 'EDITOR' | 'ADMIN';
export type DuplicateMode = 'structure' | 'structure_items' | 'structure_items_updates';

export interface Board {
  id: string;
  name: string;
  description?: string;
  type: BoardType;
  isPrivate: boolean;
  userId: string;
  createdAt: string;
  userRole?: 'OWNER' | 'VIEWER' | 'EDITOR' | 'ADMIN';
  _count?: { members: number };
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface BoardInvite {
  id: string;
  boardId: string;
  email: string;
  role: MemberRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminOverview {
  users: { id: string; name: string; email: string; role: string; createdAt: string }[];
  boards: {
    id: string; name: string; type: string; userId: string; createdAt: string;
    members: { id: string; role: MemberRole; user: { id: string; name: string; email: string } }[];
  }[];
}

export const boardsApi = {
  getAll: () => api.get<{ data: Board[] }>('/boards'),
  getOne: (id: string) => api.get<{ data: Board }>(`/boards/${id}`),
  create: (name: string, type: BoardType = 'NORMAL', description?: string) =>
    api.post<{ data: Board }>('/boards', { name, type, description }),
  update: (id: string, data: { name?: string; description?: string; isPrivate?: boolean }) =>
    api.patch<{ data: Board }>(`/boards/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/boards/${id}`),

  archive: (id: string) => api.patch<{ data: Board }>(`/boards/${id}/archive`, {}),
  unarchive: (id: string) => api.patch<{ data: Board }>(`/boards/${id}/unarchive`, {}),
  restore: (id: string) => api.patch<{ data: Board }>(`/boards/${id}/restore`, {}),
  permanentDelete: (id: string) => api.delete<{ message: string }>(`/boards/${id}/permanent`),
  duplicate: (id: string, newName: string, mode: DuplicateMode = 'structure_items') =>
    api.post<{ data: Board }>(`/boards/${id}/duplicate`, { newName, mode }),

  getMembers: (boardId: string) =>
    api.get<{ data: BoardMember[] }>(`/boards/${boardId}/members`),
  addMember: (boardId: string, email: string, role: MemberRole = 'VIEWER') =>
    api.post<{ data: BoardMember }>(`/boards/${boardId}/members`, { email, role }),
  updateMemberRole: (boardId: string, memberId: string, role: MemberRole) =>
    api.patch<{ data: BoardMember }>(`/boards/${boardId}/members/${memberId}`, { role }),
  removeMember: (boardId: string, memberId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/members/${memberId}`),

  listInvites: (boardId: string) =>
    api.get<{ data: BoardInvite[] }>(`/boards/${boardId}/invites`),
  revokeInvite: (boardId: string, inviteId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/invites/${inviteId}`),

  addMemberById: (boardId: string, userId: string, role: MemberRole = 'VIEWER') =>
    api.post<{ data: BoardMember }>(`/boards/${boardId}/members/by-id`, { userId, role }),
  removeMemberByUserId: (boardId: string, userId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/members/user/${userId}`),

  getAdminOverview: () => api.get<{ data: AdminOverview }>('/boards/admin/overview'),
};
