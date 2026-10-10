import { DEFAULT_CENTER, distanceMeters, estimateEtaSeconds, interpolate, type GeoPoint } from '@/lib/geo';
import { mockDelay } from '@/lib/mock';
import { RealtimeEvent, realtimeSocket } from '@/lib/realtime';
import type { ServiceDetail } from '@/lib/service';

/**
 * Simulación de un servicio completo: aceptado → en camino (el barbero se
 * acerca con ETA) → en el sitio → completado.
 */

const services = new Map<string, ServiceDetail>();
const running = new Set<string>();

/** "demo-camilo-rojas-lx3k" -> "Camilo Rojas" (así lo arma el mock del mapa). */
function nameFromId(serviceId: string): string {
  const parts = serviceId.split('-').slice(1, -1);
  if (parts.length === 0) return 'Tu barbero';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

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

function changeStatus(service: ServiceDetail, status: ServiceDetail['status']): void {
  service.status = status;
  realtimeSocket.dispatch(RealtimeEvent.ServiceStatusChanged, {
    serviceId: service.serviceId,
    status,
    changedAt: new Date().toISOString(),
  });
}

function simulate(service: ServiceDetail): void {
  if (running.has(service.serviceId)) return;
  running.add(service.serviceId);

  setTimeout(() => changeStatus(service, 'ON_THE_WAY'), 3_000);

  const timer = setInterval(() => {
    if (service.status !== 'ON_THE_WAY' || !service.vendorLocation) return;

    const next = interpolate(service.vendorLocation, service.customerLocation, 0.14);
    // Un poco de ruido lateral: nadie conduce en línea recta perfecta.
    next.lat += (Math.random() - 0.5) * 0.00012;
    next.lng += (Math.random() - 0.5) * 0.00012;
    service.vendorLocation = next;
    service.etaSeconds = estimateEtaSeconds(next, service.customerLocation);

    realtimeSocket.dispatch(RealtimeEvent.ServiceLocationUpdate, {
      serviceId: service.serviceId,
      ...next,
      etaSeconds: service.etaSeconds,
      updatedAt: new Date().toISOString(),
    });

    if (distanceMeters(next, service.customerLocation) < 60) {
      clearInterval(timer);
      changeStatus(service, 'ARRIVED');
      setTimeout(() => changeStatus(service, 'COMPLETED'), 12_000);
    }
  }, 2_000);
}

export async function mockFetchService(serviceId: string): Promise<ServiceDetail> {
  let service = services.get(serviceId);
  if (!service) {
    const customerLocation = await currentPosition();
    const vendorLocation = { lat: customerLocation.lat + 0.009, lng: customerLocation.lng - 0.007 };
    service = {
      serviceId,
      status: 'ACCEPTED',
      vendor: { id: 'vendor-demo', name: nameFromId(serviceId), specialty: 'Fade y barba' },
      customer: { id: 'user-demo', name: 'Tú' },
      customerLocation,
      vendorLocation,
      etaSeconds: estimateEtaSeconds(vendorLocation, customerLocation),
      updatedAt: new Date().toISOString(),
    };
    services.set(serviceId, service);
  }
  await mockDelay(500);
  simulate(service);
  return structuredClone(service);
}
