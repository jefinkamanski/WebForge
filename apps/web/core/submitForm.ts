// Envio de formulário do site para a API (POST /site/forms/:key), feito pelo navegador.
// Não manda cookies: o envio é público, protegido na API por rate limit e honeypot.

export type SubmitResult =
  { ok: true } | { ok: false; message: string; fields: Record<string, string> };

export async function submitForm(
  apiUrl: string,
  formKey: string,
  data: Record<string, unknown>,
): Promise<SubmitResult> {
  try {
    const response = await fetch(`${apiUrl}/site/forms/${formKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(data),
    });
    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string; fields?: Record<string, string[]> };
    } | null;
    const fields: Record<string, string> = {};
    for (const [name, messages] of Object.entries(body?.error?.fields ?? {})) {
      if (messages[0]) fields[name] = messages[0];
    }
    return {
      ok: false,
      fields,
      message:
        response.status === 400
          ? 'Confira os campos destacados.'
          : (body?.error?.message ?? 'Não foi possível enviar agora. Tente de novo em instantes.'),
    };
  } catch {
    return {
      ok: false,
      fields: {},
      message: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
    };
  }
}
