import { apiClient } from '@/lib/api-client';
import { USE_MOCKS } from '@/lib/mock';
import type { CoreServiceDto, ServiceDetail } from '@/lib/service';
import { toServiceDetail } from '@/lib/service';
import { mockFetchService } from './mocks';

/** Snapshot del servicio: el WS trae estado y posición desde aquí. */
export async function fetchService(serviceId: string): Promise<ServiceDetail> {
  if (USE_MOCKS) return mockFetchService(serviceId);
  const dto = await apiClient.get<CoreServiceDto>(`/services/${serviceId}`);
  return toServiceDetail(dto);
}
