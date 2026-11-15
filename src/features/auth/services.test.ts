// HU-G2 (frontend): el servicio que intercambia el id_token de Google por el JWT propio.
// Las pruebas interceptan `fetch` (lo mismo que hace el apiClient por debajo) en lugar
// de mockear el apiClient, porque asi se verifica tambien que la ruta y el payload sean
// los que el backend espera.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authErrorMessage, loginWithGoogle } from './services';

const AUTH_RESPONSE_OK = {
  token: 'jwt-propio.xxxxx.yyyyy',
  usuario: {
    id: 42,
    nombre: 'Ana Google',
    correo: 'ana@google.com',
    rol: 'USUARIO',
    creadoEn: new Date('2026-11-15T10:00:00Z').toISOString(),
  },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('loginWithGoogle', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    fetchSpy.mockReset();
    // El test corre con VITE_USE_MOCKS=false para ejercitar la rama de red.
    vi.stubEnv('VITE_USE_MOCKS', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('manda el idToken al endpoint /auth/google y normaliza el rol USUARIO -> CUSTOMER', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE_OK));

    const session = await loginWithGoogle({ idToken: 'id-token-google' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token-google' });
    // auth: false -> no se manda Authorization (si no, el 401 propio del navegador
    // se solaparia con el que el backend reserva para id_token invalido).
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    expect(session.token).toBe(AUTH_RESPONSE_OK.token);
    expect(session.user).toMatchObject({
      id: '42',
      email: 'ana@google.com',
      role: 'CUSTOMER',
    });
  });

  it('propaga un 401 del backend como ApiError 401 (id_token invalido)', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, { error: 'token_google_invalido', message: 'firma invalida' }),
    );

    await expect(loginWithGoogle({ idToken: 'id-token-manipulado' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('authErrorMessage traduce un 401 de Google a un mensaje de credenciales', () => {
    const mensaje = authErrorMessage(new ApiError(401, 'firma invalida'), 'login');
    expect(mensaje).toMatch(/incorrect/i);
  });
});
