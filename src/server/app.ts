import { existsSync } from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { Config } from './config.js';
import { AppError, httpStatusFor } from './errors.js';
import { createRequestLog, type RequestLog } from './logging/requestLog.js';
import { createNominatim, type Nominatim } from './providers/nominatim.js';
import { createForecast, type Forecast } from './providers/openMeteoForecast.js';
import { createGeocoding, type Geocoding } from './providers/openMeteoGeocoding.js';
import { registerPositionRoute } from './routes/position.js';
import { registerSearchRoute } from './routes/search.js';
import { registerWeatherRoute } from './routes/weather.js';
import { createPositionService } from './services/positionService.js';
import { createSearchService } from './services/searchService.js';
import { createWeatherService } from './services/weatherService.js';

export interface Providers {
  geocoding: Geocoding;
  forecast: Forecast;
  nominatim: Nominatim;
}

export interface BuildAppOptions {
  config: Config;
  requestLog?: RequestLog;
  providers?: Partial<Providers>;
}

export async function buildApp({
  config,
  requestLog,
  providers = {},
}: BuildAppOptions): Promise<FastifyInstance> {
  // logger: false means Fastify writes no request logs (which would include IP/User-Agent, FR-015).
  const app = Fastify({ logger: false });
  const log = requestLog ?? createRequestLog({ logDir: config.logDir });
  app.decorate('requestLog', log);
  app.addHook('onClose', async () => {
    await log.close();
  });

  app.setErrorHandler((err, _req, reply) => {
    let code: AppError['code'] = 'WEATHER_UNAVAILABLE';
    if (err instanceof AppError) code = err.code;
    else if ((err as { validation?: unknown }).validation) code = 'INVALID_INPUT';
    void reply.status(httpStatusFor(code)).send({ error: { code } });
  });

  const geocoding = providers.geocoding ?? createGeocoding({ baseUrl: config.geocodingUrl });
  const forecast = providers.forecast ?? createForecast({ baseUrl: config.forecastUrl });
  const nominatim =
    providers.nominatim ??
    createNominatim({
      baseUrl: config.nominatimUrl,
      userAgent: config.nominatimUserAgent,
      minIntervalMs: config.nominatimMinIntervalMs,
    });
  registerSearchRoute(app, createSearchService({ geocoding, nominatim }));
  registerWeatherRoute(app, createWeatherService({ forecast }));
  registerPositionRoute(app, createPositionService({ nominatim }));

  const staticDir = path.resolve(config.staticDir);
  const hasClient = existsSync(path.join(staticDir, 'index.html'));
  if (hasClient) {
    await app.register(fastifyStatic, { root: staticDir, wildcard: false });
  }

  app.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api/') && req.method === 'GET' && hasClient) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    requestLog: RequestLog;
  }
}
