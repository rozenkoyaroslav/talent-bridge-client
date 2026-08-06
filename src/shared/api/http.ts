import { tokenStore } from './token-store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const API_PREFIX = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: URLSearchParams;
  /** Skips the refresh-and-retry cycle; used by the refresh call itself. */
  skipAuthRetry?: boolean;
  signal?: AbortSignal;
};

const buildUrl = (path: string, params?: URLSearchParams) => {
  const url = `${API_URL}${API_PREFIX}${path}`;
  return params?.toString() ? `${url}?${params.toString()}` : url;
};

const parseBody = async (response: Response) => {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * A single in-flight refresh shared by every 401.
 *
 * Without this, a screen that fires five parallel requests would trigger five
 * refreshes; four of them race, and whichever lands last wins — so four requests
 * retry with a token that has already been replaced.
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = (await parseBody(response)) as { accessToken?: string } | null;
      const token = data?.accessToken ?? null;
      tokenStore.set(token);

      return token;
    } catch {
      return null;
    } finally {
      // Cleared in a microtask so callers awaiting this promise all see the same result.
      queueMicrotask(() => {
        refreshPromise = null;
      });
    }
  })();

  return refreshPromise;
};

const send = async (path: string, options: RequestOptions, token: string | null) => {
  const isFormData = options.body instanceof FormData;

  return fetch(buildUrl(path, options.params), {
    method: options.method ?? 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body !== undefined && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response = await send(path, options, tokenStore.get());

  if (response.status === 401 && !options.skipAuthRetry) {
    const token = await refreshAccessToken();

    if (!token) {
      tokenStore.clear();
      throw new ApiError(401, 'Session expired');
    }

    response = await send(path, options, token);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const message =
      (body as { message?: string | string[] })?.message ?? response.statusText ?? 'Request failed';

    throw new ApiError(
      response.status,
      Array.isArray(message) ? message.join(', ') : message,
      body,
    );
  }

  return body as T;
};

export const api = {
  get: <T>(path: string, params?: URLSearchParams) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  refresh: () => request<{ accessToken: string; user: unknown }>('/auth/refresh', {
    method: 'POST',
    skipAuthRetry: true,
  }),
};
