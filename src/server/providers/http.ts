import { fetch } from 'undici';
import type { UpstreamCall, UpstreamProvider } from '../../shared/types.js';
import { UPSTREAM_TIMEOUT_MS } from '../config.js';

export type UpstreamErrorKind = 'http' | 'timeout' | 'network' | 'malformed';

export class UpstreamError extends Error {
  /** Every attempt, oldest first; `call` is the last one. */
  readonly calls: UpstreamCall[];

  constructor(
    readonly kind: UpstreamErrorKind,
    readonly call: UpstreamCall,
    priorAttempts: UpstreamCall[] = [],
  ) {
    super(`${call.provider} ${kind}${call.status === null ? '' : ` ${call.status}`}`);
    this.name = 'UpstreamError';
    this.calls = [...priorAttempts, call];
  }
}

export interface FetchJsonOptions {
  provider: UpstreamProvider;
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface UpstreamResult<T = unknown> {
  body: T;
  /** The successful (last) attempt. */
  call: UpstreamCall;
  /** Every attempt, oldest first, for the request log (FR-015). Omitted means just `call`. */
  calls?: UpstreamCall[];
}

/** All attempts behind a result or error, oldest first. */
export function attemptsOf(r: { call: UpstreamCall; calls?: UpstreamCall[] }): UpstreamCall[] {
  return r.calls ?? [r.call];
}

async function attempt(
  url: string,
  { provider, timeoutMs = UPSTREAM_TIMEOUT_MS, headers, signal }: FetchJsonOptions,
): Promise<{ body: unknown; call: UpstreamCall }> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
  const start = performance.now();
  const callWith = (status: number | null): UpstreamCall => ({
    provider,
    status,
    ms: Math.round(performance.now() - start),
  });

  let res;
  try {
    res = await fetch(url, {
      headers: { accept: 'application/json', ...headers },
      signal: combined,
    });
  } catch {
    throw new UpstreamError(combined.aborted ? 'timeout' : 'network', callWith(null));
  }

  let text: string;
  try {
    text = await res.text();
  } catch {
    throw new UpstreamError(combined.aborted ? 'timeout' : 'network', callWith(null));
  }
  if (!res.ok) throw new UpstreamError('http', callWith(res.status));
  try {
    return { body: JSON.parse(text) as unknown, call: callWith(res.status) };
  } catch {
    throw new UpstreamError('malformed', callWith(res.status));
  }
}

/**
 * GETs JSON from an upstream. A connection failure (refused, reset, DNS) is retried once,
 * because those fail fast and are often transient; timeouts and HTTP errors are not retried.
 * The caller's signal (the per-request budget) still bounds both attempts.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions,
): Promise<UpstreamResult<T>> {
  let first: UpstreamError;
  try {
    const r = await attempt(url, options);
    return { body: r.body as T, call: r.call, calls: [r.call] };
  } catch (e) {
    if (!(e instanceof UpstreamError) || e.kind !== 'network' || options.signal?.aborted) throw e;
    first = e;
  }
  try {
    const r = await attempt(url, options);
    return { body: r.body as T, call: r.call, calls: [first.call, r.call] };
  } catch (e) {
    if (!(e instanceof UpstreamError)) throw e;
    throw new UpstreamError(e.kind, e.call, [first.call]);
  }
}
