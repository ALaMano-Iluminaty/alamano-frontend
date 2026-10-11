import { apiClient } from '@/lib/api-client';
import { USE_MOCKS } from '@/lib/mock';
import { readStorage, removeStorage, writeStorage } from '@/utils';
import { toServiceDetail, type CoreServiceDto } from './coreMapping';
import type { ServiceDetail } from './flow';

/**
 * 6.4 — Resincronización de los servicios en curso al reconectar.
 *
 * GET /api/services/active devuelve los servicios activos donde el usuario es
 * profesional o cliente. Mientras no esté desplegado (flag vacío), el cliente
 * recuerda en localStorage el servicio que creó y lo vuelve a pedir por id; el
 * vendedor no tiene cómo recuperarlo.
 */

const STORAGE_KEY = 'barberia.activeService';

/** Quien pide sus servicios: `id` es el `sub` del token. */
export interface ActiveServicesViewer {
  id: string;
  role: 'CUSTOMER' | 'SELLER';
}

/**
 * TODO: activar con `/services/active` (GET /api/services/active) cuando el
 * Core esté desplegado. Relativa a VITE_API_GATEWAY_URL. Vacía = desactivado.
 * Se lee en cada llamada, no al cargar el módulo.
 */
function activeServicesPath(): string {
  return import.meta.env.VITE_ACTIVE_SERVICES_PATH ?? '';
}

/**
 * El Core devuelve los servicios de los dos lados: un mismo usuario puede ser
 * profesional en uno y cliente en otro. Cada pantalla solo quiere los de su rol.
 */
export function filterByRole(services: readonly ServiceDetail[], viewer: ActiveServicesViewer): ServiceDetail[] {
  return services.filter((service) =>
    viewer.role === 'SELLER' ? service.vendor.id === viewer.id : service.customer.id === viewer.id,
  );
}

/** Servicios activos del usuario en su rol. null = el endpoint aún no está activado (flag vacío). */
export async function fetchActiveServices(viewer: ActiveServicesViewer): Promise<ServiceDetail[] | null> {
  const path = activeServicesPath();
  if (USE_MOCKS || !path) return null;
  const services = await apiClient.get<CoreServiceDto[]>(path);
  return filterByRole(services.map(toServiceDetail), viewer);
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
