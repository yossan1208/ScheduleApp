import { api } from './client';

export interface NoteItem {
  id: number;
  name: string;
  color: string;
  groupId: number;
  creatorId: number;
  createdAt: string;
  isArchived: boolean;
  isSystem: boolean;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface MemoListItem {
  id: number;
  title: string | null;
  isImportant: boolean;
  updatedAt: string | null;
}

export interface MemoBlock {
  id: number;
  type: string;
  content: string | null;
  sortOrder: number;
}

export interface MemoDetail {
  id: number;
  title: string | null;
  isImportant: boolean;
  updatedBy: number | null;
  updatedAt: string | null;
  blocks: MemoBlock[];
}

export interface NotePayload {
  name: string;
  color: string;
}

export interface SaveMemoPayload {
  blocks: Array<{ type: string; content: string | null; sortOrder: number }>;
}

export const notes = {
  getAll:  (archived = false) => api.get<NoteItem[]>(`/notes${archived ? '?archived=true' : ''}`),
  create:  (payload: NotePayload) => api.post<NoteItem>('/notes', payload),
  update:  (id: number, payload: NotePayload) => api.put<NoteItem>(`/notes/${id}`, payload),
  archive: (id: number) => api.patch<object>(`/notes/${id}/archive`),
  delete:  (id: number) => api.delete<object>(`/notes/${id}`),
};

export const memos = {
  getByNote: (noteId: number) => api.get<MemoListItem[]>(`/notes/${noteId}/memos`),
  create:    (noteId: number) => api.post<MemoListItem>(`/notes/${noteId}/memos`, {}),
  getDetail: (id: number)     => api.get<MemoDetail>(`/memos/${id}`),
  save:      (id: number, payload: SaveMemoPayload) => api.put<object>(`/memos/${id}`, payload),
  delete:    (id: number)     => api.delete<object>(`/memos/${id}`),
};
