import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
// O bcrypt só considera os primeiros 72 bytes: acima disso, o resto da senha seria ignorado
export const PASSWORD_MAX_BYTES = 72;

function utf8Length(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

const email = z.string().trim().toLowerCase().pipe(z.email().max(255));

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .refine((value) => utf8Length(value) <= PASSWORD_MAX_BYTES, {
        message: 'A senha é longa demais',
      }),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Administrador do painel, como a API devolve (nunca inclui o hash da senha)
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  mustChangePassword: boolean;
}
