import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiClient: api,
}));
vi.mock('@/lib/mock', () => ({ USE_MOCKS: false, mockDelay: () => Promise.resolve() }));

import { ApiError } from '@/lib/api-client';
import { ASSIGNABLE_ROLES, adminErrorMessage, changeUserRole, fetchUsers } from './services';

const dto = (id: number, rol: string) => ({
  id,
  nombre: `Usuario ${id}`,
  correo: `u${id}@demo.com`,
  rol,
  creadoEn: '2026-11-10T10:00:00Z',
});

describe('admin-users services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetchUsers pide la lista al Auth y traduce los roles del backend', async () => {
    api.get.mockResolvedValueOnce([dto(1, 'USUARIO'), dto(2, 'VENDEDOR'), dto(3, 'ADMIN')]);

    const users = await fetchUsers();

    expect(api.get).toHaveBeenCalledWith('/usuarios', { baseUrl: '/auth' });
    expect(users.map((user) => user.role)).toEqual(['CUSTOMER', 'SELLER', 'ADMIN']);
    expect(users[0]).toEqual({
      id: '1',
      name: 'Usuario 1',
      email: 'u1@demo.com',
      role: 'CUSTOMER',
      createdAt: '2026-11-10T10:00:00Z',
    });
  });

  it('changeUserRole manda el rol con el nombre del backend', async () => {
    api.patch.mockResolvedValueOnce(dto(7, 'VENDEDOR'));

    const updated = await changeUserRole('7', 'SELLER');

    expect(api.patch).toHaveBeenCalledWith('/usuarios/7/rol', { rol: 'VENDEDOR' }, { baseUrl: '/auth' });
    expect(updated.role).toBe('SELLER');
  });

  it('changeUserRole codifica el id en la ruta', async () => {
    api.patch.mockResolvedValueOnce(dto(1, 'ADMIN'));
    await changeUserRole('a/b', 'ADMIN');
    expect(api.patch.mock.calls[0][0]).toBe('/usuarios/a%2Fb/rol');
  });

  it('ofrece los tres roles', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['CUSTOMER', 'SELLER', 'ADMIN']);
  });

  it('adminErrorMessage explica el 403, el 404 y los fallos del servidor', () => {
    expect(adminErrorMessage(new ApiError(403, 'x'))).toMatch(/permiso de administrador/);
    expect(adminErrorMessage(new ApiError(404, 'x'))).toMatch(/ya no existe/);
    expect(adminErrorMessage(new ApiError(503, 'x'))).toMatch(/no responde/);
    expect(adminErrorMessage(new ApiError(409, 'Conflicto de rol'))).toBe('Conflicto de rol');
    expect(adminErrorMessage(new ApiError(400, 'Rol inválido'))).toBe('Rol inválido');
    expect(adminErrorMessage(new Error('boom'))).toBe('No se pudo completar la operación.');
  });
});
