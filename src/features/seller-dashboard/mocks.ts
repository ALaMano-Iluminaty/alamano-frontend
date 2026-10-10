import type { GeoPoint } from '@/lib/geo';
import { mockDelay } from '@/lib/mock';
import { RealtimeEvent, realtimeSocket } from '@/lib/realtime';
import type { MyPromo, NewPromo } from './services';

/**
 * Simulación para el panel del barbero: clientes que gastan cupos de sus
 * promociones y, al rato de conectarse, un cliente que lo reserva.
 */

const promos: MyPromo[] = [];
let seeded = false;

function seed(vendorId: string): void {
  if (seeded) return;
  seeded = true;
  promos.push({
    promoId: 'my-p1',
    vendorId,
    title: 'Corte + barba',
    description: 'Fade a elección y perfilado de barba.',
    remaining: 6,
    total: 10,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  });
}

export async function mockMyPromos(vendorId: string): Promise<MyPromo[]> {
  await mockDelay(500);
  seed(vendorId);
  return promos.map((promo) => ({ ...promo }));
}

export async function mockCreatePromo(vendorId: string, input: NewPromo): Promise<MyPromo> {
  await mockDelay(700);
  const promo: MyPromo = {
    promoId: `my-p${promos.length + 1}`,
    vendorId,
    title: input.title,
    description: input.description,
    remaining: input.totalSlots,
    total: input.totalSlots,
    createdAt: new Date().toISOString(),
  };
  promos.unshift(promo);
  return { ...promo };
}

/**
 * Arranca mientras el barbero está en línea; devuelve la función para parar.
 * La posición la da el propio navegador: aquí solo se simula a los clientes.
 */
export function startOnlineSimulation(getPosition: () => GeoPoint | null): () => void {
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;

    const promo = promos.filter((p) => p.remaining > 0)[tick % Math.max(promos.length, 1)];
    if (promo && tick % 2 === 0) {
      promo.remaining -= 1;
      realtimeSocket.dispatch(RealtimeEvent.PromoStockUpdated, {
        promoId: promo.promoId,
        vendorId: promo.vendorId,
        remaining: promo.remaining,
        total: promo.total,
      });
    }

    if (tick === 5) {
      const here = getPosition();
      realtimeSocket.dispatch(RealtimeEvent.ServiceAssigned, {
        serviceId: `demo-laura-${Date.now().toString(36)}`,
        customerName: 'Laura Méndez',
        customerLocation: here
          ? { lat: here.lat - 0.006, lng: here.lng + 0.004 }
          : { lat: 4.645, lng: -74.06 },
      });
    }
  }, 2_500);

  return () => clearInterval(timer);
}
