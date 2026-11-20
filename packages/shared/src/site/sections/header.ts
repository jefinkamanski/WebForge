import { z } from 'zod';
import { defineSection, imageField, linkListField } from '../../core/index.js';

export const header = defineSection({
  key: 'header',
  label: 'Cabeçalho',
  schema: z.object({
    logo: imageField(),
    navItems: linkListField(8),
  }),
});
