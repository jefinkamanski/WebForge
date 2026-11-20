// CLIENTE (editado no fork): registro das seções e dos formulários deste site.
// Cada seção fica em ./sections/<nome>.ts (docs/SECOES.md) e cada formulário em
// ./forms/<nome>.ts (docs/FORMULARIOS.md).
import { registerForms, registerSections } from '../core/index.js';
import { contact } from './forms/contact.js';
import { footer } from './sections/footer.js';
import { header } from './sections/header.js';
import { hero } from './sections/hero.js';
import { seo } from './sections/seo.js';

export const sections = registerSections(header, hero, footer, seo);

export const forms = registerForms(contact);
