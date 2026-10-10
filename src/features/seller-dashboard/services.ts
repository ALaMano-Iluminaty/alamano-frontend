import { apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import { mockCreatePromo, mockMyPromos } from './mocks';

export interface MyPromo {
  promoId: string;
  vendorId: string;
  title: string;
  description: string;
  remaining: number;
  total: number;
  createdAt: string;
}

export interface NewPromo {
  title: string;
  description: string;
  totalSlots: number;
}

/** Radio en el que los clientes ven al barbero, en metros. Solo visual. */
export const COVERAGE_RADIUS_M = 3_000;

/** Código del 409 cuando el barbero tiene un servicio en curso. */
export const PROFESSIONAL_BUSY = 'professional_busy';

/** Lo que devuelve el Core en POST /professionals/me/online. */
interface ProfessionalStatusDto {
  professionalId: string;
  status: string;
  latitude: number;
  longitude: number;
  version: number;
}

/**
 * Se anuncia disponible en el Core; el id sale del token. 409 con
 * `professional_busy` si tiene un servicio en curso.
 */
export async function goOnlineAtCore(position: GeoPoint): Promise<void> {
  if (USE_MOCKS) return;
  await apiClient.post<ProfessionalStatusDto>('/professionals/me/online', {
    latitude: position.lat,
    longitude: position.lng,
  });
}

export function fetchMyPromos(vendorId: string): Promise<MyPromo[]> {
  if (USE_MOCKS) return mockMyPromos(vendorId);
  return apiClient.get<MyPromo[]>('/seller/promotions');
}

export function createPromo(vendorId: string, promo: NewPromo): Promise<MyPromo> {
  if (USE_MOCKS) return mockCreatePromo(vendorId, promo);
  return apiClient.post<MyPromo>('/seller/promotions', promo);
}
