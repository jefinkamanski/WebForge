import { z } from 'zod';
import { defineForm, emailFieldSchema, formField } from '../../core/index.js';

export const contact = defineForm({
  key: 'contact',
  label: 'Contato',
  emailField: 'email',
  fields: {
    name: formField('Nome', z.string().trim().min(2, 'Informe seu nome.').max(120)),
    email: formField('E-mail', emailFieldSchema),
    phone: formField('Telefone', z.string().trim().max(30).default('')),
    message: formField(
      'Mensagem',
      z.string().trim().min(10, 'Escreva sua mensagem (mínimo de 10 caracteres).').max(5000),
    ),
  },
});
