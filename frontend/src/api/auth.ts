import { api } from './client';

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  name: string;
  role: number;
  themeColorHex: string;
  language: string;
}

export const auth = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', body),

  logout: () =>
    api.post<null>('/auth/logout', {}),
};
