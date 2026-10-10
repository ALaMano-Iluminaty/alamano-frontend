import { DEFAULT_CENTER, type GeoPoint } from '@/lib/geo';
import { mockConflict, mockDelay } from '@/lib/mock';
import type { ServiceStatus } from '@/lib/realtime';
import { nextStatus, type ServiceDetail } from '@/lib/service';

/** Servicio simulado desde el lado del barbero. El GPS es el real del navegador. */

const services = new Map<string, ServiceDetail>();

function currentPosition(): Promise<GeoPoint> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(DEFAULT_CENTER);
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => resolve(DEFAULT_CENTER),
      { timeout: 5_000, maximumAge: 60_000 },
    );
  });
}

export async function mockFetchService(serviceId: string): Promise<ServiceDetail> {
  let service = services.get(serviceId);
  if (!service) {
    const here = await currentPosition();
    service = {
      serviceId,
      status: 'ACCEPTED',
      vendor: { id: 'vendor-demo', name: 'Tú' },
      customer: { id: 'user-demo', name: 'Laura Méndez', address: 'Cra. 9 # 62-15, apto 302' },
      customerLocation: { lat: here.lat - 0.006, lng: here.lng + 0.004 },
      vendorLocation: here,
      updatedAt: new Date().toISOString(),
    };
    services.set(serviceId, service);
  }
  await mockDelay(500);
  return structuredClone(service);
}

export async function mockAdvanceStatus(serviceId: string, status: ServiceStatus): Promise<ServiceDetail> {
  await mockDelay(650);
  const service = services.get(serviceId);
  // Igual que haría el gateway: solo se acepta el siguiente estado del flujo.
  if (!service || nextStatus(service.status) !== status) mockConflict('Transición de estado no válida');
  service.status = status;
  service.updatedAt = new Date().toISOString();
  return structuredClone(service);
}

export async function mockSendLocation(): Promise<void> {
  await mockDelay(120);
}
