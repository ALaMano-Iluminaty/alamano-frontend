import type { GeoPoint } from '@/lib/geo';
import { mockConflict, mockDelay } from '@/lib/mock';
import { RealtimeEvent, realtimeSocket } from '@/lib/realtime';
import type { Promo, Vendor } from './services';

/**
 * Simulación del broker para el mapa del cliente: barberos que se mueven,
 * otros clientes que gastan cupos y barberos que se desconectan y vuelven.
 * Todo entra por `realtimeSocket.dispatch`, igual que un evento real.
 */

const SEED: { name: string; specialty: string; offset: [number, number]; promos: Omit<Promo, 'promoId' | 'vendorId'>[] }[] = [
  {
    name: 'Camilo Rojas',
    specialty: 'Fade y barba',
    offset: [0.004, 0.003],
    promos: [
      { title: 'Corte + barba', description: 'Fade a elección y perfilado de barba.', remaining: 3, total: 10 },
    ],
  },
  { name: 'Santiago Gil', specialty: 'Corte clásico con tijera', offset: [-0.006, 0.002], promos: [] },
  {
    name: 'Sergio Luna',
    specialty: 'Diseños y cejas',
    offset: [0.002, -0.007],
    promos: [
      { title: 'Cejas gratis', description: 'Con cualquier corte, perfilado de cejas incluido.', remaining: 1, total: 5 },
      { title: 'Diseño express', description: 'Una línea o figura simple en 15 minutos.', remaining: 0, total: 6 },
    ],
  },
  { name: 'Felipe Ortiz', specialty: 'Afeitado con navaja', offset: [-0.003, -0.004], promos: [] },
  {
    name: 'Daniel Pardo',
    specialty: 'Corte infantil',
    offset: [0.008, -0.001],
    promos: [
      { title: '2x1 hermanos', description: 'Dos cortes infantiles en la misma visita.', remaining: 4, total: 8 },
    ],
  },
  { name: 'Mateo Vargas', specialty: 'Fade y diseño', offset: [-0.008, -0.006], promos: [] },
];

/** Este barbero siempre "lo reserva otro antes": sirve para ver el 409. */
export const MOCK_CONTESTED_VENDOR = 'v2';

const vendors = new Map<string, Vendor>();
const offline = new Map<string, Vendor>();
let simulation: ReturnType<typeof setInterval> | null = null;
let tick = 0;

function seed(center: GeoPoint): void {
  if (vendors.size > 0 || offline.size > 0) return;
  SEED.forEach((entry, index) => {
    const vendorId = `v${index + 1}`;
    vendors.set(vendorId, {
      vendorId,
      name: entry.name,
      specialty: entry.specialty,
      lat: center.lat + entry.offset[0],
      lng: center.lng + entry.offset[1],
      updatedAt: new Date().toISOString(),
      promos: entry.promos.map((promo, promoIndex) => ({
        ...promo,
        promoId: `${vendorId}-p${promoIndex + 1}`,
        vendorId,
      })),
    });
  });
}

function step(): void {
  tick += 1;

  // Cada barbero se desplaza unos metros.
  for (const vendor of vendors.values()) {
    vendor.lat += (Math.random() - 0.5) * 0.0006;
    vendor.lng += (Math.random() - 0.5) * 0.0006;
    vendor.updatedAt = new Date().toISOString();
    realtimeSocket.dispatch(RealtimeEvent.VendorLocationUpdate, {
      vendorId: vendor.vendorId,
      lat: vendor.lat,
      lng: vendor.lng,
      updatedAt: vendor.updatedAt,
    });
  }

  // Otro cliente toma un cupo de vez en cuando.
  if (tick % 4 === 0) {
    const promos = [...vendors.values()].flatMap((vendor) => vendor.promos).filter((p) => p.remaining > 0);
    const promo = promos[Math.floor(Math.random() * promos.length)];
    if (promo) {
      promo.remaining -= 1;
      realtimeSocket.dispatch(RealtimeEvent.PromoStockUpdated, {
        promoId: promo.promoId,
        vendorId: promo.vendorId,
        remaining: promo.remaining,
        total: promo.total,
      });
    }
  }

  // Un barbero se desconecta y vuelve unos segundos después.
  if (tick % 10 === 0) {
    const back = [...offline.values()][0];
    if (back) {
      offline.delete(back.vendorId);
      vendors.set(back.vendorId, back);
      realtimeSocket.dispatch(RealtimeEvent.VendorLocationUpdate, {
        vendorId: back.vendorId,
        name: back.name,
        lat: back.lat,
        lng: back.lng,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const leaving = vendors.get('v6');
      if (leaving) {
        vendors.delete(leaving.vendorId);
        offline.set(leaving.vendorId, leaving);
        realtimeSocket.dispatch(RealtimeEvent.VendorDisconnected, {
          vendorId: leaving.vendorId,
          reason: 'OFFLINE',
        });
      }
    }
  }
}

export async function mockNearbyVendors(center: GeoPoint): Promise<Vendor[]> {
  await mockDelay(700);
  seed(center);
  simulation ??= setInterval(step, 2_500);
  return [...vendors.values()].map((vendor) => ({
    ...vendor,
    promos: vendor.promos.map((promo) => ({ ...promo })),
  }));
}

export async function mockReserveVendor(vendorId: string): Promise<{ serviceId: string }> {
  await mockDelay(900);
  const vendor = vendors.get(vendorId);
  if (!vendor || vendorId === MOCK_CONTESTED_VENDOR) {
    vendors.delete(vendorId);
    mockConflict('El barbero ya fue reservado por otro cliente');
  }
  vendors.delete(vendorId);
  realtimeSocket.dispatch(RealtimeEvent.VendorDisconnected, { vendorId, reason: 'RESERVED' });
  // El id lleva el nombre para que el mock de tracking pueda mostrarlo.
  const slug = vendor.name.toLowerCase().replace(/\s+/g, '-');
  return { serviceId: `demo-${slug}-${Date.now().toString(36)}` };
}

export async function mockClaimPromo(promoId: string): Promise<{ remaining: number; total: number }> {
  await mockDelay(700);
  const promo = [...vendors.values()].flatMap((vendor) => vendor.promos).find((p) => p.promoId === promoId);
  if (!promo || promo.remaining <= 0) mockConflict('Sin cupos');
  promo.remaining -= 1;
  realtimeSocket.dispatch(RealtimeEvent.PromoStockUpdated, {
    promoId: promo.promoId,
    vendorId: promo.vendorId,
    remaining: promo.remaining,
    total: promo.total,
  });
  return { remaining: promo.remaining, total: promo.total };
}
