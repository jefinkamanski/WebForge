import type { AuthUser } from '@site/shared';
import { redirect } from 'react-router';
import { ApiError, api } from '../../lib/api.ts';

interface UserResponse {
  user: AuthUser;
}

// Sem sessão (ou sessão expirada) devolve null em vez de redirecionar
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await api<UserResponse>('/auth/me')).user;
  } catch (error) {
    if (error instanceof Response || (error instanceof ApiError && error.status === 401)) {
      return null;
    }
    throw error;
  }
}

// Garante sessão ativa; com troca de senha pendente, só a tela de troca é liberada
export async function requireUser(options: { allowPasswordChangePending?: boolean } = {}) {
  const { user } = await api<UserResponse>('/auth/me');

  if (user.mustChangePassword && !options.allowPasswordChangePending) {
    throw redirect('/change-password');
  }
  return user;
}

export const login = (body: { email: string; password: string }) =>
  api<UserResponse>('/auth/login', { method: 'POST', json: body });

export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  api<UserResponse>('/auth/change-password', { method: 'POST', json: body });

export const logout = () => api<void>('/auth/logout', { method: 'POST' });
