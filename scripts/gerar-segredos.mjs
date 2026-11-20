import { randomBytes } from 'node:crypto';

// Gera segredos novos para colar no .env (ou no painel da hospedagem).
// Use valores diferentes em cada instalação e nunca os commite.
const secret = () => randomBytes(48).toString('base64url');

console.log(`JWT_SECRET=${secret()}`);
console.log(`REVALIDATE_SECRET=${secret()}`);
