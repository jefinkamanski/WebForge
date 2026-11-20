import { z } from 'zod';
import { defineSection, linkListField } from '../../core/index.js';

export const footer = defineSection({
  key: 'footer',
  label: 'Rodapé',
  schema: z.object({
    text: z.string().trim().max(400).default(''),
    links: linkListField(10),
  }),
});
