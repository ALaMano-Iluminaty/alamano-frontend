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

/** Lo que devuelve el gateway en /auth/login y /auth/register. */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

/** El backend usa CLIENT / PROFESSIONAL; el frontend, CUSTOMER / SELLER. */
const BACKEND_ROLES: Record<string, UserRole> = {
  CLIENT: 'CUSTOMER',
  PROFESSIONAL: 'SELLER',
};

function normalizeRole(role: string): UserRole {
  return BACKEND_ROLES[role] ?? (role as UserRole);
}

function toSession(response: AuthResponse): Session {
  const user = { ...response.user, role: normalizeRole(response.user.role) };
  return { token: response.accessToken, refreshToken: response.refreshToken, user };
}

export async function login(payload: LoginPayload): Promise<Session> {
  if (USE_MOCKS) return mockLogin(payload);
  return toSession(await apiClient.post<AuthResponse>('/auth/login', payload, { auth: false }));
}

export async function register(payload: RegisterPayload): Promise<Session> {
  if (USE_MOCKS) return mockRegister(payload);
  return toSession(await apiClient.post<AuthResponse>('/auth/register', payload, { auth: false }));
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

  // Sin registro previo: el correo decide el rol, para poder probar las dos vistas.
  const isSeller = email.toLowerCase().startsWith('barbero');
  return toSession(
    mockTokens({
      id: isSeller ? 'vendor-demo' : 'user-demo',
      name: email.split('@')[0],
      email: email.toLowerCase(),
      role: isSeller ? 'SELLER' : 'CUSTOMER',
    }),
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
