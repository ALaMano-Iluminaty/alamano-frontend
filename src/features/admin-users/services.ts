import type { UserRole } from '@/context';
import { ApiError, apiClient } from '@/lib/api-client';
import { USE_MOCKS, mockDelay } from '@/lib/mock';
import { AUTH_ROLES, normalizeRole } from '@/features/auth';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

/** Lo que devuelve el Auth Service en GET /auth/usuarios y PATCH /auth/usuarios/{id}/rol. */
interface UsuarioDto {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  creadoEn: string;
}

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL ?? '/auth';

/** Roles que el administrador puede asignar, en el orden en que se ofrecen. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = ['CUSTOMER', 'SELLER', 'ADMIN'];

export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Cliente',
  SELLER: 'Barbero',
  ADMIN: 'Administrador',
};

function toManagedUser(dto: UsuarioDto): ManagedUser {
  return {
    id: String(dto.id),
    name: dto.nombre,
    email: dto.correo,
    role: normalizeRole(dto.rol),
    createdAt: dto.creadoEn,
  };
}

/** HU-Q3: lista las cuentas para poder cambiarles el rol. Solo ADMIN. */
export async function fetchUsers(): Promise<ManagedUser[]> {
  if (USE_MOCKS) return mockFetchUsers();
  const dtos = await apiClient.get<UsuarioDto[]>('/usuarios', { baseUrl: AUTH_BASE_URL });
  return dtos.map(toManagedUser);
}

/**
 * HU-Q3: cambia el rol de una cuenta. La autorización real vive en el Auth
 * Service (403 si quien llama no es ADMIN); la pantalla solo la refleja.
 */
export async function changeUserRole(userId: string, role: UserRole): Promise<ManagedUser> {
  if (USE_MOCKS) return mockChangeRole(userId, role);
  const dto = await apiClient.patch<UsuarioDto>(
    `/usuarios/${encodeURIComponent(userId)}/rol`,
    { rol: AUTH_ROLES[role] },
    { baseUrl: AUTH_BASE_URL },
  );
  return toManagedUser(dto);
}

/** Traduce los errores del Auth a algo que el administrador pueda entender. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'No tienes permiso de administrador para hacer este cambio.';
    if (error.status === 404) return 'Esa cuenta ya no existe. Recarga la lista.';
    if (error.status === 409) return error.message;
    if (error.status >= 500) return 'El servidor no responde. Prueba de nuevo en unos segundos.';
    return error.message;
  }
  return 'No se pudo completar la operación.';
}

// ---------- modo demo ----------

let mockUsers: ManagedUser[] = [
  { id: 'admin-demo', name: 'Admin Demo', email: 'admin@demo.com', role: 'ADMIN', createdAt: '2026-11-01T10:00:00Z' },
  { id: '2', name: 'Camila Rojas', email: 'camila@demo.com', role: 'CUSTOMER', createdAt: '2026-11-03T15:20:00Z' },
  { id: '3', name: 'Andrés Pardo', email: 'barbero.andres@demo.com', role: 'SELLER', createdAt: '2026-11-04T09:10:00Z' },
  { id: '4', name: 'Laura Gómez', email: 'laura@demo.com', role: 'CUSTOMER', createdAt: '2026-11-08T18:45:00Z' },
];

async function mockFetchUsers(): Promise<ManagedUser[]> {
  await mockDelay(400);
  return mockUsers.map((user) => ({ ...user }));
}

async function mockChangeRole(userId: string, role: UserRole): Promise<ManagedUser> {
  await mockDelay(400);
  const found = mockUsers.find((user) => user.id === userId);
  if (!found) throw new ApiError(404, 'Usuario no encontrado');
  const updated = { ...found, role };
  mockUsers = mockUsers.map((user) => (user.id === userId ? updated : user));
  return { ...updated };
}
