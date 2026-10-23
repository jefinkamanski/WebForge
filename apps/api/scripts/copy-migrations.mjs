import { cpSync, rmSync } from 'node:fs';

// O tsc não copia arquivos .sql; a API precisa deles em dist/db/migrations no boot
rmSync('dist/db/migrations', { recursive: true, force: true });
cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });
