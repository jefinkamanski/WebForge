import type { AdminUser } from '@webforge/shared';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { adminUsers } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import { matchesPassword, signSession, verifySession } from './token.js';

export type AdminRow = typeof adminUsers.$inferSelect;

export interface AuthConfig {
  jwtSecret: string;
  cookieDomain: string;
  secureCookies: boolean;
  bcryptCost: number;
}

export function toAdminUser(user: AdminRow): AdminUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
  };
}

export function createAuthService(db: Db, config: AuthConfig) {
  // Hash descartável: login de e-mail inexistente gasta o mesmo tempo que um existente
  const dummyHash = bcrypt.hash('senha-inexistente', config.bcryptCost);

  return {
    async login(email: string, password: string) {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
      const valid = await bcrypt.compare(password, user?.passwordHash ?? (await dummyHash));
      if (!user || !valid) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
      }
      return { user, token: signSession(user, config.jwtSecret) };
    },

    async authenticate(token: string): Promise<AdminRow | null> {
      const claims = verifySession(token, config.jwtSecret);
      if (!claims) return null;

      const [user] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, claims.userId))
        .limit(1);
      if (!user || !matchesPassword(claims, user.passwordHash)) return null;
      return user;
    },

    async changePassword(user: AdminRow, currentPassword: string, newPassword: string) {
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.');
      }

      const passwordHash = await bcrypt.hash(newPassword, config.bcryptCost);
      await db
        .update(adminUsers)
        .set({ passwordHash, mustChangePassword: false })
        .where(eq(adminUsers.id, user.id));

      const updated: AdminRow = { ...user, passwordHash, mustChangePassword: false };
      return { user: updated, token: signSession(updated, config.jwtSecret) };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
