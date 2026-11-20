import { PASSWORD_MIN_LENGTH, changePasswordSchema } from '@webforge/shared';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import { AuthCard } from '../../layout/AuthCard.tsx';
import { ApiError } from '../../lib/api.ts';
import { issuesToFieldErrors } from '../../lib/forms.ts';
import { Alert, Button, TextField } from '../../ui/index.ts';
import { changePassword, requireUser } from './auth.api.ts';

interface ChangePasswordResult {
  errors?: Record<string, string>;
  message?: string;
}

export async function loader() {
  const user = await requireUser({ allowPasswordChangePending: true });
  return { mustChange: user.mustChangePassword };
}

export async function action({
  request,
}: {
  request: Request;
}): Promise<ChangePasswordResult | Response> {
  const form = Object.fromEntries(await request.formData());
  if (form['newPassword'] !== form['confirmPassword']) {
    return { errors: { confirmPassword: 'As senhas não conferem.' } };
  }

  const parsed = changePasswordSchema.safeParse(form);
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error) };

  try {
    await changePassword(parsed.data);
    return redirect('/');
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message };
    throw error;
  }
}

export function Component() {
  const { mustChange } = useLoaderData<typeof loader>();
  const result = useActionData<ChangePasswordResult>();
  const submitting = useNavigation().state === 'submitting';

  return (
    <AuthCard title="Trocar senha">
      {mustChange && <Alert>Por segurança, defina uma nova senha antes de continuar.</Alert>}
      {result?.message && <Alert tone="error">{result.message}</Alert>}
      <Form method="post" className="space-y-5" noValidate>
        <TextField
          label="Senha atual"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          error={result?.errors?.['currentPassword']}
        />
        <TextField
          label="Nova senha"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
          required
          error={result?.errors?.['newPassword']}
        />
        <TextField
          label="Confirmar nova senha"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={result?.errors?.['confirmPassword']}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Salvar nova senha
        </Button>
      </Form>
      {!mustChange && (
        <Link to="/" className="text-primary block text-center text-sm font-medium underline">
          Voltar ao painel
        </Link>
      )}
    </AuthCard>
  );
}
