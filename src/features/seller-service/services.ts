import { apiClient } from '@/lib/api-client';
import type { GeoPoint } from '@/lib/geo';
import { USE_MOCKS } from '@/lib/mock';
import type { ServiceStatus } from '@/lib/realtime';
import type { ServiceDetail } from '@/lib/service';
import { mockAdvanceStatus, mockFetchService, mockSendLocation } from './mocks';

export function fetchService(serviceId: string): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockFetchService(serviceId);
  return apiClient.get<ServiceDetail>(`/services/${serviceId}`);
}

/**
 * 3.2 — Avanza el estado. El front solo ofrece el siguiente paso válido,
 * pero el gateway es quien decide: si el estado ya cambió (otro dispositivo,
 * cancelación del cliente) responde 409.
 */
export function advanceStatus(serviceId: string, status: ServiceStatus): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockAdvanceStatus(serviceId, status);
  return apiClient.patch<ServiceDetail>(`/services/${serviceId}/status`, { status });
}

/** 3.2 — Posición del barbero; solo se llama mientras el servicio va EN_CAMINO. */
export function sendServiceLocation(serviceId: string, point: GeoPoint): Promise<void> {
  if (USE_MOCKS) return mockSendLocation();
  return apiClient.post<void>(`/services/${serviceId}/location`, { ...point, at: new Date().toISOString() });
}
