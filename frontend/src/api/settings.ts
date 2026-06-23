import { api } from './client';

// GET /api/users/me, PUT /api/users/me レスポンス
export interface UserProfile {
  userId:           number;
  loginId:          string;
  name:             string;
  role:             number;
  personalColorId:  number;
  personalColorHex: string;
  themeColorId:     number;
  themeColorHex:    string;
  language:         string;
}

// PUT /api/users/me リクエスト
export interface UpdateProfilePayload {
  name:            string;
  personalColorId: number;
  themeColorId:    number;
  language?:       string;
}

// PUT /api/users/me/password リクエスト
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword:     string;
  confirmPassword: string;
}

// GET /api/notifications/settings レスポンス
export interface NotificationSetting {
  genreId:                   number;
  genreName:                 string;
  colorHex:                  string;
  isEnabled:                 boolean;
  customNotificationMinutes: number | null;
}

// PUT /api/notifications/settings/{genreId} リクエスト
export interface UpdateNotificationPayload {
  isEnabled:                 boolean;
  customNotificationMinutes: number | null;
}

// GET /api/colors レスポンス
export interface ColorItem {
  colorId:     number;
  hexCode:     string;
  displayName: string;
}

export const userSettings = {
  getProfile:     ()                                => api.get<UserProfile>('/users/me'),
  updateProfile:  (payload: UpdateProfilePayload)  => api.put<UserProfile>('/users/me', payload),
  changePassword: (payload: ChangePasswordPayload) => api.put<object>('/users/me/password', payload),
};

export const notifications = {
  getSettings:    ()                                            => api.get<NotificationSetting[]>('/notifications/settings'),
  updateSetting:  (genreId: number, payload: UpdateNotificationPayload) =>
                    api.put<object>(`/notifications/settings/${genreId}`, payload),
};

export const colors = {
  getAll: () => api.get<ColorItem[]>('/colors'),
};
