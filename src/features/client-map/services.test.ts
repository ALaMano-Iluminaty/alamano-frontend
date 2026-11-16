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

import { NEARBY_RADIUS_KM, claimPromo, fetchActiveService, fetchNearbyVendors, reserveVendor } from './services';

const center = { lat: 4.65, lng: -74.08 };

describe('client-map services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetchNearbyVendors pide el radio por defecto y convierte cada barbero', async () => {
    api.get.mockResolvedValueOnce([
      {
        professionalId: 'abcdef123',
        latitude: 4.66,
        longitude: -74.09,
        distanceKm: 1.2,
        promotions: [
          { id: 'p1', description: '2x1 en corte\nSolo hoy', totalSlots: 50, availableSlots: 12 },
          { id: 'p2', description: 'Barba gratis', totalSlots: 10, availableSlots: 10 },
        ],
      },
      { professionalId: 'zzzzzz999', latitude: 4.7, longitude: -74.1, distanceKm: 3 },
    ]);

    const vendors = await fetchNearbyVendors(center);

    expect(api.get).toHaveBeenCalledWith('/professionals/nearby', {
      query: { lat: center.lat, lng: center.lng, radiusKm: NEARBY_RADIUS_KM },
    });
    expect(vendors).toHaveLength(2);
    expect(vendors[0]).toMatchObject({ vendorId: 'abcdef123', name: 'Vendedor abcdef', lat: 4.66, lng: -74.09 });
    expect(vendors[0].promos).toEqual([
      { promoId: 'p1', vendorId: 'abcdef123', title: '2x1 en corte', description: 'Solo hoy', remaining: 12, total: 50 },
      { promoId: 'p2', vendorId: 'abcdef123', title: 'Barba gratis', description: '', remaining: 10, total: 10 },
    ]);
    expect(vendors[1].promos).toEqual([]);
  });

  it('reserveVendor crea el servicio con el destino del cliente', async () => {
    api.post.mockResolvedValueOnce({ id: 'srv-1' });

    const result = await reserveVendor('pro-9', { clientId: 'c1', destination: center });

    expect(api.post).toHaveBeenCalledWith('/services', {
      professionalId: 'pro-9',
      destinationLatitude: center.lat,
      destinationLongitude: center.lng,
    });
    expect(result).toEqual({ serviceId: 'srv-1' });
  });

  it('reserveVendor propaga el 409 cuando otro cliente llegó primero', async () => {
    api.post.mockRejectedValueOnce(new Error('409'));
    await expect(reserveVendor('pro-9', { clientId: 'c1', destination: center })).rejects.toThrow('409');
  });

  it('fetchActiveService consulta el servicio y lo convierte', async () => {
    api.get.mockResolvedValueOnce({ id: 'srv-1' });
    await expect(fetchActiveService('srv-1')).resolves.toEqual({ mapped: { id: 'srv-1' } });
    expect(api.get).toHaveBeenCalledWith('/services/srv-1');
  });

  it('claimPromo reclama el cupo y devuelve lo que queda', async () => {
    api.post.mockResolvedValueOnce({ remaining: 49, total: 50 });
    await expect(claimPromo('p1')).resolves.toEqual({ remaining: 49, total: 50 });
    expect(api.post).toHaveBeenCalledWith('/promotions/p1/claims');
  });
});
