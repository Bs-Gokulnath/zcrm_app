import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AuthResponse {
  data: { user: AuthUser; accessToken: string };
}

export const authService = {
  sendOtp: (email: string, name?: string) =>
    api.postPublic<{ message: string }>('/auth/send-otp', { email, name }),

  verifyOtp: (email: string, code: string, name?: string) =>
    api.postPublic<AuthResponse>('/auth/verify-otp', { email, code, name }),
};
