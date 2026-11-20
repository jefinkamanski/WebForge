import type { AdminUser, ChangePasswordInput, LoginInput } from '@webforge/shared';
import { redirect } from 'react-router';
import { api } from '../../lib/api.ts';

interface UserResponse {
  user: AdminUser;
}

// Sem sessão devolve null em vez de redirecionar (usado na tela de login)
export async function fetchCurrentUser(): Promise<AdminUser | null> {
  try {
    return (await api<UserResponse>('/auth/me')).user;
  } catch (error) {
    if (error instanceof Response) return null;
    throw error;
  }
}

// Garante sessão ativa; com troca de senha pendente, só a tela de troca é liberada
export async function requireUser({ allowPasswordChangePending = false } = {}) {
  const { user } = await api<UserResponse>('/auth/me');
  if (user.mustChangePassword && !allowPasswordChangePending) {
    throw redirect('/change-password');
  }
  return user;
}

export const login = (body: LoginInput) =>
  api<UserResponse>('/auth/login', { method: 'POST', json: body });

export const changePassword = (body: ChangePasswordInput) =>
  api<UserResponse>('/auth/change-password', { method: 'POST', json: body });

export const logout = () => api<void>('/auth/logout', { method: 'POST' });
