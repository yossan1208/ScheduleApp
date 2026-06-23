import { api } from './client';

export interface AdminUser {
  userId:   number;
  loginId:  string;
  name:     string;
  role:     number;
  groupId:  number | null;
  isActive: boolean;
}

export interface CreateUserPayload {
  loginId:  string;
  name:     string;
  password: string;
  role:     number;
}

export interface CreateGroupPayload {
  name:    string;
  userIds: number[];
}

export const admin = {
  getUsers:    (ungrouped = false) =>
    api.get<AdminUser[]>(`/admin/users${ungrouped ? '?ungrouped=true' : ''}`),
  createUser:  (payload: CreateUserPayload) =>
    api.post<AdminUser>('/admin/users', payload),
  deactivate:  (id: number) =>
    api.patch<object>(`/admin/users/${id}/deactivate`),
  createGroup: (payload: CreateGroupPayload) =>
    api.post<object>('/admin/groups', payload),
};
