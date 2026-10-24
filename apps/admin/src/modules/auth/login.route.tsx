import { loginSchema } from '@site/shared';
import { Alert, Button, TextField } from '@site/ui';
import { Form, redirect, useActionData, useNavigation } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { issuesToFieldErrors } from '../../lib/forms.ts';
import { fetchCurrentUser, login } from './auth.api.ts';

interface LoginResult {
  errors?: Record<string, string>;
  message?: string;
}

export async function loader() {
  if (await fetchCurrentUser()) throw redirect('/');
  return null;
}

export async function action({ request }: { request: Request }): Promise<LoginResult | Response> {
  const parsed = loginSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error) };

  try {
    const { user } = await login(parsed.data);
    return redirect(user.mustChangePassword ? '/change-password' : '/');
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message };
    throw error;
  }
}

export function Component() {
  const result = useActionData<LoginResult>();
  const submitting = useNavigation().state === 'submitting';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold text-slate-900">Entrar no painel</h1>
      {result?.message && <Alert tone="error">{result.message}</Alert>}
      <Form method="post" className="space-y-4" noValidate>
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          required
          error={result?.errors?.['email']}
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={result?.errors?.['password']}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Entrar
        </Button>
      </Form>
    </main>
  );
}
