import type { Session, SessionUser, UserRole } from '@/context';
import { ApiError, apiClient } from '@/lib/api-client';
import { USE_MOCKS, mockDelay } from '@/lib/mock';

/** Credencial que devuelve Google Identity Services al elegir una cuenta (HU-Q2). */
export interface GoogleLoginPayload {
  idToken: string;
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

/**
 * HU-Q2: cambia un id_token de Google por el JWT propio del Auth Service.
 * Es la unica forma de entrar: no hay correo y contrasena. El backend valida la
 * firma contra las JWKS de Google, el emisor, la audiencia (nuestro Client ID) y
 * la expiracion antes de emitir su propio JWT (<= 30 min). El rol lo decide el
 * backend; el front solo lo refleja.
 */
export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<Session> {
  if (USE_MOCKS) return demoLogin('CUSTOMER');
  const response = await apiClient.post<LoginResponseDto>(
    '/google',
    { idToken: payload.idToken },
    { auth: false, baseUrl: AUTH_BASE_URL },
  );
  return fromAuthService(response);
}

/** Traduce los errores del Auth a algo que el usuario pueda resolver. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'No pudimos verificar tu cuenta de Google. Vuelve a intentarlo.';
    if (error.status === 403) return 'Tu cuenta no tiene acceso a la aplicación.';
    if (error.status >= 500) return 'El servidor no responde. Prueba de nuevo en unos segundos.';
    return error.message;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'La conexión tardó demasiado. Revisa tu internet y vuelve a intentarlo.';
  }
  return 'No se pudo iniciar sesión.';
}

// ---------- modo demo (solo con VITE_USE_MOCKS=true) ----------

const DEMO_USERS: Record<UserRole, SessionUser> = {
  CUSTOMER: { id: 'user-demo', name: 'Cliente demo', email: 'cliente@demo.com', role: 'CUSTOMER' },
  SELLER: { id: 'vendor-demo', name: 'Barbero demo', email: 'barbero@demo.com', role: 'SELLER' },
  ADMIN: { id: 'admin-demo', name: 'Admin demo', email: 'admin@demo.com', role: 'ADMIN' },
};

/** Sesion falsa para ver las tres vistas sin Auth ni Google. */
export async function demoLogin(role: UserRole): Promise<Session> {
  await mockDelay(400);
  const user = DEMO_USERS[role];
  const stamp = btoa(`${user.email}:${Date.now()}`);
  return { token: `demo.${stamp}.access`, refreshToken: `demo.${stamp}.refresh`, user };
}
