import { changePasswordSchema, loginSchema } from '@site/shared';
import type { RequestHandler } from 'express';
import { clearSessionCookie, getSessionUser, setSessionCookie } from './auth.middleware.js';
import { toAuthUser, type AuthConfig, type AuthService } from './auth.service.js';

export function createAuthController(service: AuthService, config: AuthConfig) {
  const login: RequestHandler = async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await service.login(email, password);

    setSessionCookie(res, config, token);
    res.json({ user: toAuthUser(user) });
  };

  const logout: RequestHandler = (_req, res) => {
    clearSessionCookie(res, config);
    res.status(204).end();
  };

  const me: RequestHandler = (_req, res) => {
    res.json({ user: toAuthUser(getSessionUser(res)) });
  };

  const changePassword: RequestHandler = async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const { user, token } = await service.changePassword(
      getSessionUser(res),
      currentPassword,
      newPassword,
    );

    setSessionCookie(res, config, token);
    res.json({ user: toAuthUser(user) });
  };

  return { login, logout, me, changePassword };
}
