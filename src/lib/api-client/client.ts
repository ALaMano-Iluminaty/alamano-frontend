import { ApiError, type ApiErrorBody, type RequestOptions } from './types';

const BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? '/api';
const DEFAULT_TIMEOUT_MS = 15_000;

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;
/** Pide un access token nuevo con el refresh token. null = no se pudo. */
type TokenRefresher = () => Promise<string | null>;

/**
 * El token no se lee de localStorage directamente: la sesión lo inyecta.
 * Así el cliente REST no depende de cómo se guarda la sesión.
 */
let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};
let refreshToken: TokenRefresher | null = null;

/**
 * Si varias peticiones reciben 401 a la vez, todas esperan a la misma
 * renovación: el refresh token suele ser de un solo uso.
 */
let refreshInFlight: Promise<string | null> | null = null;

export function configureApiClient(options: {
  getToken?: TokenProvider;
  onUnauthorized?: UnauthorizedHandler;
  refresh?: TokenRefresher;
}): void {
  if (options.getToken) getToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
  if (options.refresh) refreshToken = options.refresh;
}

function renewToken(): Promise<string | null> {
  if (!refreshToken) return Promise.resolve(null);
  refreshInFlight ??= refreshToken()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** `new URL` no acepta una base relativa como `/api`: se completa con el origen actual. */
function absoluteBase(): string {
  const base = BASE_URL.startsWith('/') ? `${window.location.origin}${BASE_URL}` : BASE_URL;
  return `${base.replace(/\/$/, '')}/`;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), absoluteBase());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // respuesta sin cuerpo JSON
  }
  return new ApiError(
    response.status,
    body.message ?? `Error ${response.status} en ${response.url}`,
    body.code ?? body.error,
    body.details,
  );
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
  /** Token recién renovado: se usa en el reintento tras un 401. */
  retryToken?: string,
): Promise<T> {
  const { body, query, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, auth = true, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const token = auth ? (retryToken ?? getToken()) : null;

  try {
    const response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 401 && auth) {
      // Un solo reintento: si el token renovado también da 401, se cierra sesión.
      if (!retryToken) {
        const renewed = await renewToken();
        if (renewed) return request<T>(method, path, options, renewed);
      }
      onUnauthorized();
      throw await parseError(response);
    }

    if (!response.ok) throw await parseError(response);

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
