import { apiClient } from '@/lib/api-client';
import { USE_MOCKS } from '@/lib/mock';
import type { ServiceDetail } from '@/lib/service';
import { mockFetchService } from './mocks';

/** Snapshot del servicio: el WS trae estado y posición desde aquí. */
export function fetchService(serviceId: string): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockFetchService(serviceId);
  return apiClient.get<ServiceDetail>(`/services/${serviceId}`);
}
