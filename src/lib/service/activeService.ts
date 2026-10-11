import { apiClient } from '@/lib/api-client';
import { USE_MOCKS } from '@/lib/mock';
import { readStorage, removeStorage, writeStorage } from '@/utils';
import { toServiceDetail, type CoreServiceDto } from './coreMapping';
import type { ServiceDetail } from './flow';

/**
 * 6.4 — Resincronización de los servicios en curso al reconectar.
 *
 * El Core aún no expone "mis servicios activos". Mientras no exista, el cliente
 * recuerda en localStorage el servicio que creó y lo vuelve a pedir por id; el
 * vendedor no tiene cómo recuperarlo.
 */

const STORAGE_KEY = 'barberia.activeService';

/**
 * TODO: activar con `/services/active` (GET /api/services/active) cuando el
 * Core esté desplegado. Relativa a VITE_API_GATEWAY_URL. Vacía = desactivado.
 */
const ACTIVE_SERVICES_PATH = import.meta.env.VITE_ACTIVE_SERVICES_PATH ?? '';

/** Servicios activos del usuario del token. null = el endpoint aún no existe (flag apagado). */
export async function fetchActiveServices(): Promise<ServiceDetail[] | null> {
  if (USE_MOCKS || !ACTIVE_SERVICES_PATH) return null;
  const services = await apiClient.get<CoreServiceDto[]>(ACTIVE_SERVICES_PATH);
  return services.map(toServiceDetail);
}

export function rememberActiveService(serviceId: string): void {
  writeStorage(STORAGE_KEY, serviceId);
}

export function readActiveService(): string | null {
  return readStorage<string | null>(STORAGE_KEY, null);
}

/** Olvida el servicio guardado; con `serviceId`, solo si es ese. */
export function forgetActiveService(serviceId?: string): void {
  if (serviceId && readActiveService() !== serviceId) return;
  removeStorage(STORAGE_KEY);
}
