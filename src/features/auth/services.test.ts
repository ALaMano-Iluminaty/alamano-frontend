// HU-Q2 (frontend): el servicio que intercambia el id_token de Google por el JWT propio.
// Las pruebas interceptan `fetch` (lo mismo que hace el apiClient por debajo) en lugar
// de mockear el apiClient, porque asi se verifica tambien que la ruta y el payload sean
// los que el backend espera.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mock', () => ({ USE_MOCKS: false, mockDelay: () => Promise.resolve() }));

import { ApiError } from '@/lib/api-client';
import { authErrorMessage, demoLogin, loginWithGoogle, normalizeRole } from './services';

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

  beforeEach(() => fetchSpy.mockReset());

  it('manda el idToken al endpoint /auth/google y normaliza el rol USUARIO -> CUSTOMER', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE_OK));

    const session = await loginWithGoogle({ idToken: 'id-token-google' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ idToken: 'id-token-google' });
    // auth: false -> no se manda Authorization.
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    expect(session.token).toBe(AUTH_RESPONSE_OK.token);
    expect(session.user).toMatchObject({ id: '42', email: 'ana@google.com', role: 'CUSTOMER' });
  });

  it('un VENDEDOR y un ADMIN del backend llegan con su rol del front', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { ...AUTH_RESPONSE_OK, usuario: { ...AUTH_RESPONSE_OK.usuario, rol: 'VENDEDOR' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ...AUTH_RESPONSE_OK, usuario: { ...AUTH_RESPONSE_OK.usuario, rol: 'ADMIN' } }));

    expect((await loginWithGoogle({ idToken: 'a' })).user.role).toBe('SELLER');
    expect((await loginWithGoogle({ idToken: 'b' })).user.role).toBe('ADMIN');
  });

  it('propaga un 401 del backend como ApiError 401 (id_token invalido)', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, { error: 'token_google_invalido', message: 'firma invalida' }),
    );

    await expect(loginWithGoogle({ idToken: 'id-token-manipulado' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('normalizeRole', () => {
  it('traduce los nombres del Auth y los del contrato entre servicios', () => {
    expect(normalizeRole('USUARIO')).toBe('CUSTOMER');
    expect(normalizeRole('CLIENT')).toBe('CUSTOMER');
    expect(normalizeRole('VENDEDOR')).toBe('SELLER');
    expect(normalizeRole('PROFESSIONAL')).toBe('SELLER');
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
  });
});

describe('authErrorMessage', () => {
  it('traduce 401, 403 y errores del servidor', () => {
    expect(authErrorMessage(new ApiError(401, 'x'))).toMatch(/verificar tu cuenta de Google/);
    expect(authErrorMessage(new ApiError(403, 'x'))).toMatch(/no tiene acceso/);
    expect(authErrorMessage(new ApiError(503, 'x'))).toMatch(/servidor no responde/);
  });

  it('otros errores del backend conservan su mensaje', () => {
    expect(authErrorMessage(new ApiError(409, 'conflicto'))).toBe('conflicto');
  });

  it('avisa cuando la conexión se agota', () => {
    const abort = new Error('timeout');
    abort.name = 'AbortError';
    expect(authErrorMessage(abort)).toMatch(/tardó demasiado/);
  });

  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(authErrorMessage('???')).toBe('No se pudo iniciar sesión.');
  });
});

describe('demoLogin', () => {
  it('entrega una sesión falsa con el rol pedido', async () => {
    const admin = await demoLogin('ADMIN');
    const seller = await demoLogin('SELLER');

    expect(admin.user).toMatchObject({ id: 'admin-demo', role: 'ADMIN' });
    expect(seller.user).toMatchObject({ id: 'vendor-demo', role: 'SELLER' });
    expect(admin.token).toMatch(/^demo\./);
    expect(admin.refreshToken).toMatch(/^demo\./);
  });
});
