import { apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import { toServiceDetail, type CoreServiceDto, type ServiceDetail } from '@/lib/service';
import { mockCreatePromo, mockIncomingService, mockMyPromos } from './mocks';

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

/**
 * Detalle del servicio que acaban de reservarle. El evento RESERVED no trae
 * destino ni nombre del cliente: el destino sale de aquí.
 */
export async function fetchIncomingService(serviceId: string): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockIncomingService(serviceId);
  const dto = await apiClient.get<CoreServiceDto>(`/services/${serviceId}`);
  return toServiceDetail(dto);
}

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

/** Lo que devuelve el Core en POST /promotions y GET /promotions/{id}. */
interface PromotionDto {
  id: string;
  professionalId: string;
  description: string;
  totalSlots: number;
  availableSlots: number;
  createdAt: string;
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

/**
 * HU5 — Sale del mapa. Sin cuerpo: el id sale del token. Un 409
 * `professional_busy` significa que tiene un servicio en curso.
 */
export async function goOfflineAtCore(): Promise<void> {
  if (USE_MOCKS) return;
  await apiClient.post<ProfessionalStatusDto>('/professionals/me/offline');
}

// El Core guarda un solo texto por promoción: el título va en la primera línea
// y el detalle en el resto (40 + 120 caracteres caben de sobra en sus 500).
function toCoreDescription({ title, description }: NewPromo): string {
  return `${title}\n${description}`;
}

function toMyPromo(dto: PromotionDto): MyPromo {
  const lineBreak = dto.description.indexOf('\n');
  const title = lineBreak === -1 ? dto.description : dto.description.slice(0, lineBreak);
  const description = lineBreak === -1 ? '' : dto.description.slice(lineBreak + 1);
  return {
    promoId: dto.id,
    vendorId: dto.professionalId,
    title,
    description,
    remaining: dto.availableSlots,
    total: dto.totalSlots,
    createdAt: dto.createdAt,
  };
}

export async function fetchMyPromos(vendorId: string): Promise<MyPromo[]> {
  if (USE_MOCKS) return mockMyPromos(vendorId);
  const mine = await apiClient.get<PromotionDto[]>('/promotions/mine');
  return mine.map(toMyPromo).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPromo(vendorId: string, promo: NewPromo): Promise<MyPromo> {
  if (USE_MOCKS) return mockCreatePromo(vendorId, promo);
  const created = await apiClient.post<PromotionDto>('/promotions', {
    description: toCoreDescription(promo),
    totalSlots: promo.totalSlots,
  });
  return toMyPromo(created);
}
