// Login y registro contra el Auth Service. Se intercepta `fetch` (igual que en
// services.test.ts) para comprobar la ruta, el cuerpo y la traducción del rol.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { authErrorMessage, login, register } from './services';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const usuario = (rol: string) => ({
  id: 7,
  nombre: 'Luis Barbero',
  correo: 'luis@correo.com',
  rol,
  creadoEn: '2026-11-15T10:00:00Z',
});

describe('login y register', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it('login manda correo y password a /auth/login y arma la sesión', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, { token: 'jwt', usuario: usuario('VENDEDOR') }));

    const session = await login({ email: 'luis@correo.com', password: 'Secreta123' });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/login');
    expect(JSON.parse(init.body as string)).toEqual({ correo: 'luis@correo.com', password: 'Secreta123' });
    expect(session.token).toBe('jwt');
    expect(session.user).toEqual({ id: '7', name: 'Luis Barbero', email: 'luis@correo.com', role: 'SELLER' });
  });

  it('register crea la cuenta con el rol del backend y luego inicia sesión', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(201, usuario('VENDEDOR')))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'jwt', usuario: usuario('VENDEDOR') }));

    const session = await register({
      name: '  Luis Barbero ',
      email: 'luis@correo.com',
      password: 'Secreta123',
      role: 'SELLER',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [registerUrl, registerInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(registerUrl).toContain('/auth/register');
    expect(JSON.parse(registerInit.body as string)).toEqual({
      nombre: 'Luis Barbero',
      correo: 'luis@correo.com',
      password: 'Secreta123',
      rol: 'VENDEDOR',
    });
    expect((fetchSpy.mock.calls[1] as [string, RequestInit])[0]).toContain('/auth/login');
    expect(session.user.role).toBe('SELLER');
  });

  it('un rol USUARIO del backend se muestra como CUSTOMER', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, { token: 'jwt', usuario: usuario('USUARIO') }));
    const session = await login({ email: 'luis@correo.com', password: 'x' });
    expect(session.user.role).toBe('CUSTOMER');
  });

  it('login con credenciales malas lanza ApiError 401', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(401, { message: 'credenciales' }));
    await expect(login({ email: 'a@b.co', password: 'mala' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authErrorMessage', () => {
  it('traduce 401, 409 en registro y errores del servidor', () => {
    expect(authErrorMessage(new ApiError(401, 'x'), 'login')).toMatch(/incorrectos/);
    expect(authErrorMessage(new ApiError(409, 'x'), 'register')).toMatch(/Ya hay una cuenta/);
    expect(authErrorMessage(new ApiError(503, 'x'), 'login')).toMatch(/servidor no responde/);
  });

  it('un 409 fuera del registro conserva el mensaje del backend', () => {
    expect(authErrorMessage(new ApiError(409, 'conflicto'), 'login')).toBe('conflicto');
  });

  it('avisa cuando la conexión se agota', () => {
    const abort = new Error('timeout');
    abort.name = 'AbortError';
    expect(authErrorMessage(abort, 'login')).toMatch(/tardó demasiado/);
  });

  it('usa un mensaje genérico según el modo para errores desconocidos', () => {
    expect(authErrorMessage('???', 'login')).toBe('No se pudo iniciar sesión.');
    expect(authErrorMessage('???', 'register')).toBe('No se pudo crear la cuenta.');
  });
});
