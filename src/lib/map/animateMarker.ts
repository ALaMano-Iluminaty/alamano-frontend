import type L from 'leaflet';
import { interpolate, type GeoPoint } from '@/lib/geo';

const running = new WeakMap<L.Marker, number>();

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lleva un marcador a `target` interpolando en línea recta.
 *
 * Las posiciones llegan por WS cada pocos segundos; sin esto el marcador da
 * saltos. Si llega una posición nueva a mitad de animación, se parte desde
 * donde está el marcador en ese momento, no desde el punto viejo.
 */
export function animateMarkerTo(marker: L.Marker, target: GeoPoint, durationMs = 1_000): void {
  const previous = running.get(marker);
  if (previous) cancelAnimationFrame(previous);

  if (prefersReducedMotion()) {
    marker.setLatLng([target.lat, target.lng]);
    return;
  }

  const from = marker.getLatLng();
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min((now - start) / durationMs, 1);
    // ease-out: arranca rápido y frena al llegar, como un vehículo.
    const eased = 1 - (1 - t) ** 3;
    const point = interpolate({ lat: from.lat, lng: from.lng }, target, eased);
    marker.setLatLng([point.lat, point.lng]);
    if (t < 1) running.set(marker, requestAnimationFrame(step));
    else running.delete(marker);
  };

  running.set(marker, requestAnimationFrame(step));
}
