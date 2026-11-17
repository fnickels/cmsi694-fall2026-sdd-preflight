import type { FastifyInstance } from 'fastify';
import type { WeatherService } from '../services/weatherService.js';
import { coordinatesQuerySchema, withRequestLog } from './requestLogging.js';

export function registerWeatherRoute(app: FastifyInstance, weatherService: WeatherService): void {
  app.get<{ Querystring: { lat: number; lon: number } }>(
    '/api/weather',
    { schema: { querystring: coordinatesQuerySchema } },
    async (req) => {
      const { lat, lon } = req.query;
      const { observation } = await withRequestLog(
        app,
        () => ({ requestType: 'weather', query: null, latitude: lat, longitude: lon }),
        ({ calls, signal }) => weatherService.current(lat, lon, { calls, signal }),
      );
      return observation;
    },
  );
}
