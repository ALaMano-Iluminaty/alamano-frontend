import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoreServiceDto } from './coreMapping';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: api }));
vi.mock('@/lib/mock', () => ({ USE_MOCKS: false }));

import { fetchActiveServices } from './activeService';

/** El mismo usuario es profesional en uno y cliente en otro. */
const BOTH_SIDES = 'user-both';

function dto(id: string, professionalId: string, clientId: string): CoreServiceDto {
  return {
    id,
    professionalId,
    clientId,
    status: 'EN_ROUTE',
    updatedAt: '2026-10-11T10:00:00Z',
    destinationLatitude: 4.65,
    destinationLongitude: -74.06,
  };
}

const ACTIVE: CoreServiceDto[] = [
  dto('svc-as-pro', BOTH_SIDES, 'cli-other'),
  dto('svc-as-client', 'pro-other', BOTH_SIDES),
];

describe('fetchActiveServices', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue(ACTIVE);
    vi.stubEnv('VITE_ACTIVE_SERVICES_PATH', '/services/active');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('pide GET /services/active (relativa a la base /api)', async () => {
    await fetchActiveServices({ id: BOTH_SIDES, role: 'SELLER' });
    expect(api.get).toHaveBeenCalledWith('/services/active');
  });

  it('como SELLER devuelve solo los servicios donde es el profesional', async () => {
    const services = await fetchActiveServices({ id: BOTH_SIDES, role: 'SELLER' });
    expect(services?.map((service) => service.serviceId)).toEqual(['svc-as-pro']);
  });

  it('como CUSTOMER devuelve solo los servicios donde es el cliente', async () => {
    const services = await fetchActiveServices({ id: BOTH_SIDES, role: 'CUSTOMER' });
    expect(services?.map((service) => service.serviceId)).toEqual(['svc-as-client']);
  });

  it('con el flag vacío no llama al Core y devuelve null', async () => {
    vi.stubEnv('VITE_ACTIVE_SERVICES_PATH', '');
    expect(await fetchActiveServices({ id: BOTH_SIDES, role: 'CUSTOMER' })).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});
