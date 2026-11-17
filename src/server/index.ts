import pino from 'pino';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { scheduleRetention } from './logging/retention.js';

const config = loadConfig();
const app = await buildApp({ config });
scheduleRetention({ logDir: config.logDir });
await app.listen({ host: '0.0.0.0', port: config.port });

// Separate logger: never receives request data.
pino({ base: null }).info(`Weather Lookup listening on port ${config.port}`);
