import { api } from './client';

export interface Genre {
  id:                      number;
  name:                    string;
  colorId:                 number;
  colorHex:                string;
  defaultNotificationTime: string | null;
  isActive:                boolean;
  isDeleted:               boolean;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
};
