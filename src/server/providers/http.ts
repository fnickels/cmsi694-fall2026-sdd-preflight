import { fetch } from 'undici';
import type { UpstreamCall, UpstreamProvider } from '../../shared/types.js';
import { UPSTREAM_TIMEOUT_MS } from '../config.js';

export type UpstreamErrorKind = 'http' | 'timeout' | 'network' | 'malformed';

export class UpstreamError extends Error {
  constructor(
    readonly kind: UpstreamErrorKind,
    readonly call: UpstreamCall,
  ) {
    super(`${call.provider} ${kind}${call.status === null ? '' : ` ${call.status}`}`);
    this.name = 'UpstreamError';
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
  call: UpstreamCall;
}

export async function fetchJson<T = unknown>(
  url: string,
  { provider, timeoutMs = UPSTREAM_TIMEOUT_MS, headers, signal }: FetchJsonOptions,
): Promise<UpstreamResult<T>> {
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
    return { body: JSON.parse(text) as T, call: callWith(res.status) };
  } catch {
    throw new UpstreamError('malformed', callWith(res.status));
  }
}
