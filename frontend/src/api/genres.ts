import { api } from './client';

export interface Genre {
  id:                      number;
  name:                    string;
  colorId:                 number;
  colorHex:                string;
  defaultNotificationTime: string | null;
  isActive:                boolean;
  isDeleted:               boolean;
  isSystem:                boolean;
}

export interface CreateGenrePayload {
  name:                    string;
  colorId:                 number;
  defaultNotificationTime: string | null;  // "HH:mm" 形式
}

export interface UpdateGenrePayload {
  name:                    string;
  colorId:                 number;
  defaultNotificationTime: string | null;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
  create: (payload: CreateGenrePayload) => api.post<Genre>('/genres', payload),
  update: (id: number, payload: UpdateGenrePayload) => api.put<Genre>(`/genres/${id}`, payload),
  delete: (id: number) => api.delete<object>(`/genres/${id}`),
};
