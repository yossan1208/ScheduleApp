import { api } from './client';

export interface Genre {
  id:       number;
  name:     string;
  colorHex: string;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
};
