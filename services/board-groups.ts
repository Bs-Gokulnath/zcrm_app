import { api } from '../lib/api';

export interface ItemUpdate {
  id: string;
  content: string;
  author: string;
  itemId: string;
  createdAt: string;
}

export interface ItemActivity {
  id: string;
  itemId: string;
  author: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface BoardItem {
  id: string;
  name: string;
  status?: string;
  priority?: string;
  owner?: string;
  state?: string;
  city?: string;
  location?: string;
  propertyType?: string;
  googleRating?: number | null;
  noOfRatings?: number | null;
  landOwnerContact?: string;
  phone?: string;
  email?: string;
  powerAvailability?: string;
  investment?: string;
  availableParking?: string;
  files?: string;
  notes?: string;
  reminderDate?: string;
  dueDate?: string;
  position: number;
  groupId: string;
  createdAt: string;
  updatedAt?: string;
  _count?: { updates: number };
}

export interface BoardGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  boardId: string;
  items: BoardItem[];
  createdAt: string;
}

export const groupsApi = {
  getAll: (boardId: string) =>
    api.get<{ data: BoardGroup[] }>(`/boards/${boardId}/groups`),

  create: (boardId: string, name: string, color?: string) =>
    api.post<{ data: BoardGroup }>(`/boards/${boardId}/groups`, { name, color }),

  delete: (boardId: string, groupId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/groups/${groupId}`),

  createItem: (boardId: string, groupId: string, name: string) =>
    api.post<{ data: BoardItem }>(`/boards/${boardId}/groups/${groupId}/items`, { name }),

  updateItem: (boardId: string, groupId: string, itemId: string, data: Partial<BoardItem>) =>
    api.patch<{ data: BoardItem }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}`, data),

  deleteItem: (boardId: string, groupId: string, itemId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}`),

  getUpdates: (boardId: string, groupId: string, itemId: string) =>
    api.get<{ data: ItemUpdate[] }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}/updates`),

  createUpdate: (boardId: string, groupId: string, itemId: string, content: string) =>
    api.post<{ data: ItemUpdate }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}/updates`, { content }),

  deleteUpdate: (boardId: string, groupId: string, itemId: string, updateId: string) =>
    api.delete<{ message: string }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}/updates/${updateId}`),

  getActivities: (boardId: string, groupId: string, itemId: string) =>
    api.get<{ data: ItemActivity[] }>(`/boards/${boardId}/groups/${groupId}/items/${itemId}/activities`),
};
