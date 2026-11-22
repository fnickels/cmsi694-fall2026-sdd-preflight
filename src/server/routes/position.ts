import type { FastifyInstance } from 'fastify';
import type { PositionService } from '../services/positionService.js';
import { coordinatesQuerySchema, withRequestLog } from './requestLogging.js';

export function registerPositionRoute(
  app: FastifyInstance,
  positionService: PositionService,
): void {
  app.get<{ Querystring: { lat: number; lon: number } }>(
    '/api/position',
    { schema: { querystring: coordinatesQuerySchema } },
    async (req) => {
      const { lat, lon } = req.query;
      const { location } = await withRequestLog<Awaited<ReturnType<PositionService['describe']>>>(
        app,
        () => ({ requestType: 'position', query: null, latitude: lat, longitude: lon }),
        ({ calls, signal }) => positionService.describe(lat, lon, { calls, signal }),
      );
      return location;
    },
  );
}
