import { apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import { mockClaimPromo, mockNearbyVendors, mockReserveVendor } from './mocks';

export interface Promo {
  promoId: string;
  vendorId: string;
  title: string;
  description: string;
  /** Cupos que quedan. Lo mantiene al día PROMO_STOCK_UPDATED. */
  remaining: number;
  total: number;
}

export interface Vendor extends GeoPoint {
  vendorId: string;
  name: string;
  specialty?: string;
  /** ISO 8601 de la última posición recibida. */
  updatedAt: string;
  promos: Promo[];
}

/** Lo que devuelve el Core en GET /professionals/nearby. */
interface NearbyPromotionDto {
  id: string;
  description: string;
  totalSlots: number;
  availableSlots: number;
}

interface NearbyProfessionalDto {
  professionalId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  promotions?: NearbyPromotionDto[];
}

/** Radio de búsqueda por defecto, en km. */
export const NEARBY_RADIUS_KM = 5;

function toPromos(vendorId: string, promotions: NearbyPromotionDto[] = []): Promo[] {
  return promotions.map((promo) => {
    const lineBreak = promo.description.indexOf('\n');
    return {
      promoId: promo.id,
      vendorId,
      title: lineBreak === -1 ? promo.description : promo.description.slice(0, lineBreak),
      description: lineBreak === -1 ? '' : promo.description.slice(lineBreak + 1),
      remaining: promo.availableSlots,
      total: promo.totalSlots,
    };
  });
}

function toVendor(dto: NearbyProfessionalDto): Vendor {
  return {
    vendorId: dto.professionalId,
    name: `Vendedor ${dto.professionalId.slice(0, 6)}`,
    lat: dto.latitude,
    lng: dto.longitude,
    updatedAt: new Date().toISOString(),
    promos: toPromos(dto.professionalId, dto.promotions),
  };
}

/** Snapshot inicial de barberos disponibles; el WS trae los cambios desde aquí. */
export async function fetchNearbyVendors(center: GeoPoint): Promise<Vendor[]> {
  if (USE_MOCKS) return mockNearbyVendors(center);
  const professionals = await apiClient.get<NearbyProfessionalDto[]>('/professionals/nearby', {
    query: { lat: center.lat, lng: center.lng, radiusKm: NEARBY_RADIUS_KM },
  });
  return professionals.map(toVendor);
}

/**
 * 4.2 — Reserva exclusiva. En el Core reservar es crear un servicio en estado
 * RESERVED (POST /services). Si otro cliente llegó antes, responde 409.
 */
export async function reserveVendor(
  vendorId: string,
  customer: { clientId: string; destination: GeoPoint },
): Promise<{ serviceId: string }> {
  if (USE_MOCKS) return mockReserveVendor(vendorId);
  const service = await apiClient.post<{ id: string }>('/services', {
    professionalId: vendorId,
    destinationLatitude: customer.destination.lat,
    destinationLongitude: customer.destination.lng,
  });
  return { serviceId: service.id };
}

/** 4.2 — Toma un cupo. 409 si ya no quedan: el contador que veías era viejo. */
export function claimPromo(promoId: string): Promise<{ remaining: number; total: number }> {
  if (USE_MOCKS) return mockClaimPromo(promoId);
  return apiClient.post<{ remaining: number; total: number }>(`/promotions/${promoId}/claims`);
}
