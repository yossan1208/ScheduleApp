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

export interface CreateSchedulePayload {
  date:             string;
  title:            string;
  visibility:       string;        // "private" | "group"
  genreId:          number;
  startTime:        string | null; // "HH:mm"
  endTime:          string | null; // "HH:mm"
  notificationTime: string;        // "HH:mm"
  detail:           string | null;
}

export const schedules = {
  getSchedules: (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    return api.get<Schedule[]>(`/schedules?${params}`);
  },
  deleteSchedule:     (id: number) => api.delete<null>(`/schedules/${id}`),
  createSchedule:     (payload: CreateSchedulePayload) =>
    api.post<Schedule>('/schedules', payload),
  getRecentSchedules: () =>
    api.get<Schedule[]>('/schedules/recent'),
};
