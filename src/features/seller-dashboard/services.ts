import { apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import { mockCreatePromo, mockMyPromos } from './mocks';
import { readStorage, writeStorage } from '@/utils';

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

/**
 * El Core todavía no lista las promociones de un vendedor (solo expone
 * GET /promotions/{id}). Mientras tanto se recuerdan en este navegador los ids
 * que publicó y se consulta cada uno para traer sus cupos al día.
 * TODO: cuando exista un endpoint para listar las propias, esto pasa a ser una sola llamada.
 */
const promoIdsKey = (vendorId: string): string => `barberia.myPromoIds.${vendorId}`;

export async function fetchMyPromos(vendorId: string): Promise<MyPromo[]> {
  if (USE_MOCKS) return mockMyPromos(vendorId);
  const ids = readStorage<string[]>(promoIdsKey(vendorId), []);
  const results = await Promise.allSettled(
    ids.map((id) => apiClient.get<PromotionDto>(`/promotions/${id}`)),
  );
  return results
    .flatMap((result) => (result.status === 'fulfilled' ? [toMyPromo(result.value)] : []))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPromo(vendorId: string, promo: NewPromo): Promise<MyPromo> {
  if (USE_MOCKS) return mockCreatePromo(vendorId, promo);
  const created = await apiClient.post<PromotionDto>('/promotions', {
    description: toCoreDescription(promo),
    totalSlots: promo.totalSlots,
  });
  const ids = readStorage<string[]>(promoIdsKey(vendorId), []);
  writeStorage(promoIdsKey(vendorId), [created.id, ...ids.filter((id) => id !== created.id)]);
  return toMyPromo(created);
}
