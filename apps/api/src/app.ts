import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

export interface AppOptions {
  corsOrigins: string[];
}

export function createApp({ corsOrigins }: AppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
