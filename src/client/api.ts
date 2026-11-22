import type { ClientErrorCode } from '../shared/types';

export class ApiError extends Error {
  constructor(readonly code: ClientErrorCode) {
    super(code);
    this.name = 'ApiError';
  }
}

const SERVER_CODES = new Set<ClientErrorCode>(['LOCATION_NOT_FOUND', 'WEATHER_UNAVAILABLE']);
const CLIENT_TIMEOUT_MS = 10_000;

export async function getJson<T>(url: string, opts: { signal?: AbortSignal } = {}): Promise<T> {
  if (!navigator.onLine) throw new ApiError('OFFLINE');
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, CLIENT_TIMEOUT_MS);
  const signal = opts.signal
    ? AbortSignal.any([controller.signal, opts.signal])
    : controller.signal;

  let res: Response;
  let body: unknown;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' }, signal });
    body = await res.json();
  } catch (e) {
    if (e instanceof TypeError && !signal.aborted) throw new ApiError('OFFLINE');
    throw new ApiError('WEATHER_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return body as T;

  const code = (body as { error?: { code?: string } } | null)?.error?.code;
  if (code && SERVER_CODES.has(code as ClientErrorCode))
    throw new ApiError(code as ClientErrorCode);
  throw new ApiError('WEATHER_UNAVAILABLE');
}
