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

import { fetchService } from './services';

describe('tracking services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetchService trae el snapshot del servicio', async () => {
    api.get.mockResolvedValueOnce({ id: 'srv-9' });
    await expect(fetchService('srv-9')).resolves.toEqual({ mapped: { id: 'srv-9' } });
    expect(api.get).toHaveBeenCalledWith('/services/srv-9');
  });
});
