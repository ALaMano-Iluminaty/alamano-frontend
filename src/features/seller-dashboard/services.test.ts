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
}));

import { createPromo, fetchIncomingService, fetchMyPromos, goOfflineAtCore, goOnlineAtCore } from './services';

const promotion = (id: string, description: string, createdAt: string) => ({
  id,
  professionalId: 'pro-1',
  description,
  totalSlots: 20,
  availableSlots: 5,
  createdAt,
});

describe('seller-dashboard services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('goOnlineAtCore manda la posición del barbero', async () => {
    api.post.mockResolvedValueOnce({});
    await goOnlineAtCore({ lat: 4.6, lng: -74.1 });
    expect(api.post).toHaveBeenCalledWith('/professionals/me/online', { latitude: 4.6, longitude: -74.1 });
  });

  it('goOfflineAtCore sale del mapa sin cuerpo', async () => {
    api.post.mockResolvedValueOnce({});
    await goOfflineAtCore();
    expect(api.post).toHaveBeenCalledWith('/professionals/me/offline');
  });

  it('fetchMyPromos ordena de la más reciente a la más antigua y separa título y detalle', async () => {
    api.get.mockResolvedValueOnce([
      promotion('a', 'Vieja', '2026-11-01T10:00:00Z'),
      promotion('b', 'Nueva\nDetalle de la nueva', '2026-11-10T10:00:00Z'),
    ]);

    const promos = await fetchMyPromos('pro-1');

    expect(api.get).toHaveBeenCalledWith('/promotions/mine');
    expect(promos.map((promo) => promo.promoId)).toEqual(['b', 'a']);
    expect(promos[0]).toMatchObject({ title: 'Nueva', description: 'Detalle de la nueva', remaining: 5, total: 20 });
    expect(promos[1]).toMatchObject({ title: 'Vieja', description: '' });
  });

  it('createPromo junta título y detalle en una sola descripción', async () => {
    api.post.mockResolvedValueOnce(promotion('c', 'Corte 2x1\nSolo hoy', '2026-11-12T10:00:00Z'));

    const created = await createPromo('pro-1', { title: 'Corte 2x1', description: 'Solo hoy', totalSlots: 20 });

    expect(api.post).toHaveBeenCalledWith('/promotions', { description: 'Corte 2x1\nSolo hoy', totalSlots: 20 });
    expect(created).toMatchObject({ promoId: 'c', title: 'Corte 2x1', description: 'Solo hoy' });
  });

  it('fetchIncomingService trae el detalle del servicio reservado', async () => {
    api.get.mockResolvedValueOnce({ id: 'srv-1' });
    await expect(fetchIncomingService('srv-1')).resolves.toEqual({ mapped: { id: 'srv-1' } });
    expect(api.get).toHaveBeenCalledWith('/services/srv-1');
  });
});
