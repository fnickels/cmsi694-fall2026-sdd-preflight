import type { FastifyInstance } from 'fastify';
import type { RequestOutcome, RequestType, UpstreamCall } from '../../shared/types.js';
import { REQUEST_BUDGET_MS } from '../config.js';
import { AppError } from '../errors.js';
import { UpstreamError } from '../providers/http.js';

export function outcomeFor(err: unknown): RequestOutcome {
  if (err instanceof AppError) {
    if (err.code === 'LOCATION_NOT_FOUND') return 'not_found';
    if (err.code === 'INVALID_INPUT') return 'invalid_input';
    if (err.cause instanceof UpstreamError && err.cause.kind === 'timeout')
      return 'upstream_timeout';
  }
  return 'upstream_error';
}

export interface LoggedRequest {
  requestType: RequestType;
  query: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Runs a handler under the per-request budget and writes exactly one RequestLogEntry
 * (FR-015), whether the handler succeeds or fails.
 */
export async function withRequestLog<T>(
  app: FastifyInstance,
  describe: (result: T | undefined) => LoggedRequest,
  run: (ctx: { calls: UpstreamCall[]; signal: AbortSignal }) => Promise<T>,
): Promise<T> {
  const started = performance.now();
  const ts = new Date().toISOString();
  const calls: UpstreamCall[] = [];
  const controller = new AbortController();
  const budget = setTimeout(() => {
    controller.abort();
  }, REQUEST_BUDGET_MS);
  let result: T | undefined;
  let outcome: RequestOutcome = 'success';
  try {
    result = await run({ calls, signal: controller.signal });
    return result;
  } catch (e) {
    outcome = outcomeFor(e);
    throw e;
  } finally {
    clearTimeout(budget);
    await app.requestLog.write({
      ts,
      ...describe(result),
      outcome,
      upstream: calls,
      durationMs: Math.round(performance.now() - started),
    });
  }
}

export const coordinatesQuerySchema = {
  type: 'object',
  required: ['lat', 'lon'],
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lon: { type: 'number', minimum: -180, maximum: 180 },
  },
} as const;
