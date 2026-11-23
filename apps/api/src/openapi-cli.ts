import { createLogger } from '@zooloo/security';
import { writeFileSync } from 'node:fs';
import { createApp } from './create-app.js';
import { buildOpenApiDocument } from './openapi.js';

// Gera apps/api/openapi.json sem banco nem rede: o pool do pg só conecta na primeira consulta.
const app = await createApp(
  {
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: 0,
    DATABASE_URL: 'postgres://openapi@127.0.0.1:1/openapi',
    DATABASE_POOL_MAX: 1,
    LOG_LEVEL: 'error',
    OPENAPI_UI: false,
    DEV_AUTH: false,
  },
  createLogger({ sink: () => undefined, level: 'error' }),
);
await app.init();
writeFileSync('openapi.json', `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
await app.close();
