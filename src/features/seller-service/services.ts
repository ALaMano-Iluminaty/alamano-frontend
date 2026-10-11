import { ApiError, apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import type { ServiceStatus } from '@/lib/realtime';
import type { CoreServiceDto, ServiceDetail } from '@/lib/service';
import { toCoreStatus, toServiceDetail } from '@/lib/service';
import { mockAdvanceStatus, mockFetchService, mockSendLocation } from './mocks';

export async function fetchService(serviceId: string): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockFetchService(serviceId);
  const dto = await apiClient.get<CoreServiceDto>(`/services/${serviceId}`);
  return toServiceDetail(dto);
}

async function patchStatus(serviceId: string, status: string): Promise<ServiceDetail> {
  const dto = await apiClient.patch<CoreServiceDto>(`/services/${serviceId}/status`, { status });
  return toServiceDetail(dto);
}

/**
 * 3.2 — Avanza el estado. El front solo ofrece el siguiente paso válido,
 * pero el Core es quien decide: si el estado ya cambió (otro dispositivo,
 * cancelación del cliente) responde 409.
 *
 * El Core exige ARRIVED -> IN_PROGRESS -> COMPLETED; en pantalla solo existe
 * "Finalizar", así que ese botón recorre los dos pasos.
 */
export async function advanceStatus(serviceId: string, status: ServiceStatus): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockAdvanceStatus(serviceId, status);
  if (status === 'COMPLETED') {
    try {
      await patchStatus(serviceId, 'IN_PROGRESS');
    } catch (error) {
      // Si ya estaba en curso (un intento anterior a medias), se sigue a COMPLETED.
      const alreadyInProgress = error instanceof ApiError && error.isConflict && error.code === 'invalid_transition';
      if (!alreadyInProgress) throw error;
    }
  }
  return patchStatus(serviceId, toCoreStatus(status));
}

/** 3.2 — Posición del barbero; solo se llama mientras el servicio va EN_CAMINO. */
export function sendServiceLocation(serviceId: string, point: GeoPoint): Promise<void> {
  if (USE_MOCKS) return mockSendLocation();
  return apiClient.post<void>(`/services/${serviceId}/location`, { ...point, at: new Date().toISOString() });
}