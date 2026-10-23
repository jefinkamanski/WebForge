import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

const SESSION_DAYS = 7;
export const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// Impressão digital do hash da senha: trocar a senha invalida as sessões antigas
function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export function signSession(user: { id: number; passwordHash: string }, secret: string): string {
  return jwt.sign({ pv: passwordFingerprint(user.passwordHash) }, secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export interface SessionClaims {
  userId: number;
  passwordFingerprint: string;
}

export function verifySession(token: string, secret: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;

    const userId = Number(payload.sub);
    const fingerprint: unknown = payload['pv'];
    if (!Number.isInteger(userId) || typeof fingerprint !== 'string') return null;

    return { userId, passwordFingerprint: fingerprint };
  } catch {
    return null;
  }
}

export function matchesPassword(claims: SessionClaims, passwordHash: string): boolean {
  return claims.passwordFingerprint === passwordFingerprint(passwordHash);
}
