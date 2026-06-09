import { api } from './client';

export interface ScheduleGenre {
  id: number;
  name: string;
  colorHex: string;
}

export interface Schedule {
  id: number;
  creatorId: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  detail: string | null;
  visibility: string;
  notificationTime: string;
  genre: ScheduleGenre | null;
}

export const schedules = {
  getSchedules: (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    return api.get<Schedule[]>(`/schedules?${params}`);
  },
  deleteSchedule: (id: number) => api.delete<null>(`/schedules/${id}`),
};
