import type { Session, SessionUser, UserRole } from '@/context';
import { ApiError, apiClient } from '@/lib/api-client';
import { USE_MOCKS, mockDelay } from '@/lib/mock';
import { readStorage, writeStorage } from '@/utils';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  role: UserRole;
}

/** Credencial que devuelve Google Identity Services al elegir una cuenta (HU-G2). */
export interface GoogleLoginPayload {
  idToken: string;
}

/** Lo que devuelve el gateway en /auth/login y /auth/register. */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

interface AuthUserDto {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  creadoEn: string;
}

interface LoginResponseDto {
  token: string;
  usuario: AuthUserDto;
}

/** Nombre de cada rol en el Auth Service. */
export const AUTH_ROLES: Record<UserRole, string> = {
  CUSTOMER: 'USUARIO',
  SELLER: 'VENDEDOR',
  ADMIN: 'ADMIN',
};

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL ?? '/auth';

function fromAuthService({ token, usuario }: LoginResponseDto): Session {
  return {
    token,
    user: {
      id: String(usuario.id),
      name: usuario.nombre,
      email: usuario.correo,
      role: normalizeRole(usuario.rol),
    },
  };
}

const BACKEND_ROLES: Record<string, UserRole> = {
  USUARIO: 'CUSTOMER',
  VENDEDOR: 'SELLER',
  ADMIN: 'ADMIN',
  CLIENT: 'CUSTOMER',
  PROFESSIONAL: 'SELLER',
};

export function normalizeRole(role: string): UserRole {
  return BACKEND_ROLES[role] ?? (role as UserRole);
}

function toSession(response: AuthResponse): Session {
  const user = { ...response.user, role: normalizeRole(response.user.role) };
  return { token: response.accessToken, refreshToken: response.refreshToken, user };
}

export async function login(payload: LoginPayload): Promise<Session> {
  if (USE_MOCKS) return mockLogin(payload);
  const response = await apiClient.post<LoginResponseDto>(
    '/login',
    { correo: payload.email, password: payload.password },
    { auth: false, baseUrl: AUTH_BASE_URL },
  );
  return fromAuthService(response);
}

/**
 * HU-G2: cambia un id_token de Google por el JWT propio del Auth Service.
 * El backend valida la firma contra las JWKS de Google, el emisor, la audiencia
 * (nuestro Client ID) y la expiracion antes de emitir su propio JWT (<= 30 min).
 * En modo demo reutilizamos el mockLogin para que la UI pueda probarse sin red.
 */
export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<Session> {
  if (USE_MOCKS) {
    return mockLogin({ email: 'google@demo.com', password: 'demo' });
  }
  const response = await apiClient.post<LoginResponseDto>(
    '/google',
    { idToken: payload.idToken },
    { auth: false, baseUrl: AUTH_BASE_URL },
  );
  return fromAuthService(response);
}

export async function register(payload: RegisterPayload): Promise<Session> {
  if (USE_MOCKS) return mockRegister(payload);
  // El registro responde 201 con el usuario y sin token: se inicia sesión a continuación.
  await apiClient.post<AuthUserDto>(
    '/register',
    {
      nombre: payload.name.trim(),
      correo: payload.email,
      password: payload.password,
      rol: AUTH_ROLES[payload.role],
    },
    { auth: false, baseUrl: AUTH_BASE_URL },
  );
  return login({ email: payload.email, password: payload.password });
}

/** Traduce los errores del gateway a algo que el usuario pueda resolver. */
export function authErrorMessage(error: unknown, mode: 'login' | 'register'): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Correo o contraseña incorrectos.';
    if (error.status === 409 && mode === 'register') {
      return 'Ya hay una cuenta con ese correo. Entra con ella en «Entrar».';
    }
    if (error.status >= 500) return 'El servidor no responde. Prueba de nuevo en unos segundos.';
    return error.message;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'La conexión tardó demasiado. Revisa tu internet y vuelve a intentarlo.';
  }
  return mode === 'login' ? 'No se pudo iniciar sesión.' : 'No se pudo crear la cuenta.';
}

// ---------- modo demo ----------

interface MockUser extends SessionUser {
  password: string;
}

const MOCK_USERS_KEY = 'barberia.mock.users';

function mockTokens(user: SessionUser): AuthResponse {
  const stamp = btoa(`${user.email}:${Date.now()}`);
  return { accessToken: `demo.${stamp}.access`, refreshToken: `demo.${stamp}.refresh`, user };
}

async function mockLogin({ email, password }: LoginPayload): Promise<Session> {
  await mockDelay(600);
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const found = users.find((user) => user.email === email.toLowerCase());

  if (found) {
    if (found.password !== password) throw new ApiError(401, 'Credenciales inválidas');
    return toSession(
      mockTokens({ id: found.id, name: found.name, email: found.email, role: found.role }),
    );
  }

  // Sin registro previo: el correo decide el rol, para poder probar las tres vistas.
  const normalized = email.toLowerCase();
  const role: UserRole = normalized.startsWith('admin')
    ? 'ADMIN'
    : normalized.startsWith('barbero')
      ? 'SELLER'
      : 'CUSTOMER';
  const ids: Record<UserRole, string> = { ADMIN: 'admin-demo', SELLER: 'vendor-demo', CUSTOMER: 'user-demo' };
  return toSession(
    mockTokens({ id: ids[role], name: email.split('@')[0], email: normalized, role }),
  );
}

async function mockRegister({ name, email, password, role }: RegisterPayload): Promise<Session> {
  await mockDelay(800);
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const normalized = email.toLowerCase();
  if (users.some((user) => user.email === normalized) || normalized.startsWith('ocupado@')) {
    throw new ApiError(409, 'Email ya registrado', 'EMAIL_TAKEN');
  }

  const user: SessionUser = {
    id: `${role === 'SELLER' ? 'vendor' : 'user'}-${users.length + 1}`,
    name: name.trim(),
    email: normalized,
    role,
  };
  writeStorage(MOCK_USERS_KEY, [...users, { ...user, password }]);
  return toSession(mockTokens(user));
}
