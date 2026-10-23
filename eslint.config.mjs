import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/next-env.d.ts',
    'apps/api/src/db/migrations/**',
    'uploads/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/api/**/*.ts', '**/*.config.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/admin/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [nextVitals],
    settings: { next: { rootDir: 'apps/web' } },
  },
  prettier,
]);
