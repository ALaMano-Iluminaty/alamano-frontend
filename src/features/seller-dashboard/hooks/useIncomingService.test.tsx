// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiClientModule from '@/lib/api-client';
import type * as ContextModule from '@/context';
import type * as RealtimeModule from '@/lib/realtime';
import type { CoreServiceDto } from '@/lib/service';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  show: vi.fn(),
  navigate: vi.fn(),
  watch: vi.fn(),
  isOnline: false,
  session: null as null | { token: string; user: { id: string; name: string; email: string; role: 'SELLER' } },
}));

vi.mock('@/lib/mock', () => ({ USE_MOCKS: false, mockDelay: () => Promise.resolve() }));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  apiClient: { get: mocks.get },
}));
vi.mock('@/context', async (importOriginal) => ({
  ...(await importOriginal<typeof ContextModule>()),
  useToast: () => ({ show: mocks.show }),
  useRealtimeConnection: () => ({ isOnline: mocks.isOnline, isRecovering: false, status: 'closed' }),
  useSession: () => ({ session: mocks.session }),
}));
vi.mock('@/lib/realtime', async (importOriginal) => ({
  ...(await importOriginal<typeof RealtimeModule>()),
  useServiceChannel: mocks.watch,
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

import { useIncomingService } from './useIncomingService';

type HookResult = ReturnType<typeof useIncomingService>;

/** JWT sin firma válida: el front solo lee el `sub`. */
function jwt(sub: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'RS256' })}.${encode({ sub, role: 'PROFESSIONAL' })}.firma`;
}

function service(id: string, professionalId: string, status = 'RESERVED'): CoreServiceDto {
  return {
    id,
    professionalId,
    clientId: 'cli-demo',
    status,
    updatedAt: '2026-10-11T23:40:52Z',
    destinationLatitude: 4.5693,
    destinationLongitude: -74.1464,
    allowedTransitions: ['CANCELLED', 'EN_ROUTE'],
  };
}

let root: Root | null = null;
let result: HookResult;

function Probe() {
  result = useIncomingService();
  return null;
}

/** Monta el hook y espera a que se resuelvan las peticiones del primer render. */
async function renderHook(): Promise<void> {
  const container = document.createElement('div');
  await act(async () => {
    root = createRoot(container);
    root.render(<Probe />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useIncomingService', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubEnv('VITE_ACTIVE_SERVICES_PATH', '/services/active');
    mocks.get.mockReset();
    mocks.show.mockReset();
    mocks.navigate.mockReset();
    mocks.watch.mockReset();
    mocks.isOnline = false;
    mocks.session = {
      token: jwt('pro-demo'),
      user: { id: 'pro-demo', name: 'Vendedor', email: 'v@demo.com', role: 'SELLER' },
    };
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('resincroniza al cargar la sesión aunque el socket esté desconectado', async () => {
    mocks.get.mockResolvedValue([service('svc-1', 'pro-demo')]);
    await renderHook();

    expect(mocks.get).toHaveBeenCalledWith('/services/active');
    expect(result.incoming).toEqual({
      serviceId: 'svc-1',
      status: 'ACCEPTED',
      destination: { lat: 4.5693, lng: -74.1464 },
    });
    // Desde ahí sigue /topic/service.{id}.
    expect(mocks.watch).toHaveBeenLastCalledWith('svc-1');
  });

  it('filtra por el sub del token aunque el id de la sesión sea otro', async () => {
    mocks.session = { ...mocks.session!, user: { ...mocks.session!.user, id: 'vendedor-1' } };
    mocks.get.mockResolvedValue([service('svc-1', 'pro-demo')]);
    await renderHook();

    expect(result.incoming?.serviceId).toBe('svc-1');
  });

  it('no deja pasar servicios de otro profesional', async () => {
    mocks.get.mockResolvedValue([service('svc-ajeno', 'pro-otro')]);
    await renderHook();

    expect(result.incoming).toBeNull();
    expect(mocks.watch).not.toHaveBeenCalledWith('svc-ajeno');
  });

  it('marca como "en curso" un servicio ya avanzado', async () => {
    mocks.get.mockResolvedValue([service('svc-1', 'pro-demo', 'EN_ROUTE')]);
    await renderHook();

    expect(result.incoming?.status).toBe('ON_THE_WAY');
  });

  it('avisa por consola en vez de tragarse el error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.get.mockRejectedValue(new Error('Core caído'));
    await renderHook();

    expect(result.incoming).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no se pudo recuperar'), expect.any(Error));
  });

  it('ante un 409 professional_busy vuelve a pedir /active, muestra el aviso y ofrece ir al servicio', async () => {
    // Al cargar todavía no había nada; el servicio aparece cuando el Core responde 409.
    mocks.get.mockResolvedValueOnce([]);
    await renderHook();
    expect(result.incoming).toBeNull();

    mocks.get.mockResolvedValueOnce([service('svc-1', 'pro-demo')]);
    await act(async () => {
      await result.handleBusy();
    });

    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(result.incoming?.serviceId).toBe('svc-1');
    const toast = mocks.show.mock.calls.at(-1)?.[0];
    expect(toast).toMatchObject({ title: 'Tienes un servicio en curso', action: { label: 'Ir al servicio' } });
    toast.action.onClick();
    expect(mocks.navigate).toHaveBeenCalledWith('/seller/service/svc-1');
  });

  it('con el flag vacío el aviso del 409 queda solo con el texto', async () => {
    vi.stubEnv('VITE_ACTIVE_SERVICES_PATH', '');
    await renderHook();
    await act(async () => {
      await result.handleBusy();
    });

    expect(mocks.get).not.toHaveBeenCalled();
    const toast = mocks.show.mock.calls.at(-1)?.[0];
    expect(toast).toMatchObject({ title: 'Tienes un servicio en curso' });
    expect(toast.action).toBeUndefined();
  });
});
