// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as ContextModule from '@/context';
import type { UserRole } from '@/context';

const mocks = vi.hoisted(() => ({ session: null as null | { user: { role: string } } }));

vi.mock('@/context', async (importOriginal) => ({
  ...(await importOriginal<typeof ContextModule>()),
  useSession: () => ({ session: mocks.session }),
}));

import { RequireAuth } from './RequireAuth';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function visit(path: string, role: UserRole | null) {
  mocks.session = role ? { user: { role } } : null;
  const container = document.createElement('div');
  root = createRoot(container);
  act(() => {
    root?.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login</p>} />
          <Route path="/map" element={<p>mapa de cliente</p>} />
          <Route path="/seller/dashboard" element={<p>panel de barbero</p>} />
          <Route path="/admin/users" element={<RequireAuth role="ADMIN" />}>
            <Route index element={<p>administración</p>} />
          </Route>
          <Route element={<RequireAuth role="SELLER" />}>
            <Route path="/seller/area" element={<p>zona de barbero</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  });
  return container.textContent;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe('RequireAuth por rol', () => {
  it('sin sesión manda al login', () => {
    expect(visit('/admin/users', null)).toBe('login');
  });

  it('el administrador entra a la administración', () => {
    expect(visit('/admin/users', 'ADMIN')).toBe('administración');
  });

  it('un cliente que intenta entrar a la administración vuelve a su mapa', () => {
    expect(visit('/admin/users', 'CUSTOMER')).toBe('mapa de cliente');
  });

  it('un barbero que intenta entrar a la administración vuelve a su panel', () => {
    expect(visit('/admin/users', 'SELLER')).toBe('panel de barbero');
  });

  it('un administrador no entra a las pantallas de barbero', () => {
    expect(visit('/seller/area', 'ADMIN')).not.toBe('zona de barbero');
  });
});
