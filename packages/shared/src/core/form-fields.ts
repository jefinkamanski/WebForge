// Nomes reservados dos formulários, sem dependências: o site importa no navegador por
// "@webforge/shared/form-fields" sem levar o Zod nem o registro junto.

// Campo escondido contra robôs: pessoas não o veem, então ele chega vazio
export const HONEYPOT_FIELD = 'website';
// Consentimento (LGPD), obrigatório em todo formulário
export const CONSENT_FIELD = 'consent';
