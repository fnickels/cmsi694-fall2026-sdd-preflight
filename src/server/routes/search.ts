import type { FastifyInstance } from 'fastify';
import { isUsZip } from '../../shared/input.js';
import type { SearchService } from '../services/searchService.js';
import { withRequestLog } from './requestLogging.js';

export function registerSearchRoute(app: FastifyInstance, searchService: SearchService): void {
  // Length and blank checks happen in the service so invalid input is still logged (FR-015).
  app.get<{ Querystring: { q: string } }>(
    '/api/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: { q: { type: 'string' } },
        },
      },
    },
    async (req) => {
      const q = req.query.q;
      const { result } = await withRequestLog<Awaited<ReturnType<SearchService['search']>>>(
        app,
        (res) => ({
          requestType: res ? res.result.queryType : isUsZip(q) ? 'zip' : 'search',
          query: q.trim().slice(0, 100) || null,
          latitude: null,
          longitude: null,
        }),
        ({ calls, signal }) => searchService.search(q, { calls, signal }),
      );
      return result;
    },
  );
}
