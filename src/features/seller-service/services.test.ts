import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiClient: api,
}));
vi.mock('@/lib/mock', () => ({
  USE_MOCKS: false,
  mockDelay: () => Promise.resolve(),
  mockConflict: vi.fn(),
}));
vi.mock('@/lib/service', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toServiceDetail: (dto: unknown) => ({ mapped: dto }),
  toCoreStatus: (status: string) => `CORE_${status}`,
}));

import { advanceStatus, fetchService, sendServiceLocation } from './services';

describe('seller-service services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetchService trae el servicio y lo convierte', async () => {
    api.get.mockResolvedValueOnce({ id: 'srv-1' });
    await expect(fetchService('srv-1')).resolves.toEqual({ mapped: { id: 'srv-1' } });
    expect(api.get).toHaveBeenCalledWith('/services/srv-1');
  });

  it('advanceStatus manda el estado en el idioma del Core', async () => {
    api.patch.mockResolvedValueOnce({ id: 'srv-1' });
    await advanceStatus('srv-1', 'ON_THE_WAY');
    expect(api.patch).toHaveBeenCalledWith('/services/srv-1/status', { status: 'CORE_ON_THE_WAY' });
  });

  it('advanceStatus propaga el 409 si el estado ya cambió', async () => {
    api.patch.mockRejectedValueOnce(new Error('409'));
    await expect(advanceStatus('srv-1', 'ARRIVED')).rejects.toThrow('409');
  });

  it('sendServiceLocation manda la posición con la hora', async () => {
    api.post.mockResolvedValueOnce(undefined);
    await sendServiceLocation('srv-1', { lat: 4.6, lng: -74.1 });
    const [path, body] = api.post.mock.calls[0] as [string, { lat: number; lng: number; at: string }];
    expect(path).toBe('/services/srv-1/location');
    expect(body).toMatchObject({ lat: 4.6, lng: -74.1 });
    expect(Number.isNaN(Date.parse(body.at))).toBe(false);
  });
});
