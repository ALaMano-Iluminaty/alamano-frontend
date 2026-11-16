// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ContextModule from '@/context';
import type { ManagedUser } from '../services';

const mocks = vi.hoisted(() => ({ fetchUsers: vi.fn(), changeUserRole: vi.fn(), show: vi.fn() }));

vi.mock('@/context', async (importOriginal) => ({
  ...(await importOriginal<typeof ContextModule>()),
  useToast: () => ({ show: mocks.show }),
}));
vi.mock('../services', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchUsers: mocks.fetchUsers,
  changeUserRole: mocks.changeUserRole,
}));

import { filterUsers, normalizeSearch, useAdminUsers } from './useAdminUsers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user = (id: string, name: string, role: ManagedUser['role'] = 'CUSTOMER'): ManagedUser => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@demo.com`,
  role,
  createdAt: '2026-11-10T10:00:00Z',
});

const USERS = [user('1', 'Admin Demo', 'ADMIN'), user('2', 'Andrés Pardo'), user('3', 'Laura Gómez')];

type HookResult = ReturnType<typeof useAdminUsers>;
let root: Root | null = null;
let result: HookResult;

function Probe({ currentUserId }: { currentUserId: string }) {
  result = useAdminUsers(currentUserId);
  return null;
}

async function mount(currentUserId = '1') {
  const container = document.createElement('div');
  root = createRoot(container);
  await act(async () => {
    root?.render(<Probe currentUserId={currentUserId} />);
  });
}

describe('filterUsers', () => {
  it('ignora tildes y mayúsculas y busca en nombre y correo', () => {
    expect(normalizeSearch('  ANDRÉS ')).toBe('andres');
    expect(filterUsers(USERS, 'andres').map((u) => u.id)).toEqual(['2']);
    expect(filterUsers(USERS, 'LAURA@').map((u) => u.id)).toEqual(['3']);
    expect(filterUsers(USERS, '')).toHaveLength(3);
    expect(filterUsers(USERS, 'zzz')).toHaveLength(0);
  });
});

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchUsers.mockResolvedValue(USERS);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
  });

  it('carga la lista al montar', async () => {
    await mount();
    expect(result.loading).toBe(false);
    expect(result.total).toBe(3);
    expect(result.error).toBeNull();
  });

  it('muestra un mensaje si la carga falla', async () => {
    mocks.fetchUsers.mockRejectedValueOnce(new Error('caído'));
    await mount();
    expect(result.error).toBe('No se pudo completar la operación.');
    expect(result.total).toBe(0);
  });

  it('cambia el rol, actualiza la fila y avisa', async () => {
    mocks.changeUserRole.mockResolvedValueOnce({ ...USERS[1], role: 'SELLER' });
    await mount();

    await act(async () => result.changeRole(USERS[1], 'SELLER'));

    expect(mocks.changeUserRole).toHaveBeenCalledWith('2', 'SELLER');
    expect(result.users.find((u) => u.id === '2')?.role).toBe('SELLER');
    expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success', title: 'Rol actualizado' }));
    expect(result.savingId).toBeNull();
  });

  it('no deja que el administrador se cambie su propio rol', async () => {
    await mount('1');
    await act(async () => result.changeRole(USERS[0], 'CUSTOMER'));
    expect(mocks.changeUserRole).not.toHaveBeenCalled();
  });

  it('no llama al servidor si el rol no cambia', async () => {
    await mount();
    await act(async () => result.changeRole(USERS[1], 'CUSTOMER'));
    expect(mocks.changeUserRole).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el cambio, deja la fila como estaba y avisa', async () => {
    mocks.changeUserRole.mockRejectedValueOnce(new Error('403'));
    await mount();

    await act(async () => result.changeRole(USERS[1], 'ADMIN'));

    expect(result.users.find((u) => u.id === '2')?.role).toBe('CUSTOMER');
    expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({ tone: 'conflict', title: 'No se cambió el rol' }));
  });

  it('filtra la lista con la búsqueda', async () => {
    await mount();
    await act(async () => result.setQuery('laura'));
    expect(result.users.map((u) => u.id)).toEqual(['3']);
    expect(result.total).toBe(3);
  });
});
