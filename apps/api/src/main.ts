import { createLogger, stdoutSink } from '@zooloo/security';
import { loadEnv } from './config/env.js';
import { createApp } from './create-app.js';

const env = loadEnv(process.env);
const logger = createLogger({ sink: stdoutSink, level: env.LOG_LEVEL }).child({ service: 'api' });
const app = await createApp(env, logger);
await app.listen(env.PORT, env.HOST);
logger.info('api no ar', { host: env.HOST, port: env.PORT });
