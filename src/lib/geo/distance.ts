export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Centro por defecto cuando el navegador no da la ubicación (permiso negado,
 * sin GPS). Bogotá; cambiarlo aquí si la operación arranca en otra ciudad.
 */
export const DEFAULT_CENTER: GeoPoint = { lat: 4.6533, lng: -74.0836 };

const EARTH_RADIUS_M = 6_371_000;

/** Distancia en metros entre dos puntos (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Punto a `fraction` (0..1) del camino entre `from` y `to`. */
export function interpolate(from: GeoPoint, to: GeoPoint, fraction: number): GeoPoint {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

/**
 * ETA de respaldo cuando el backend no manda `etaSeconds`: línea recta a la
 * velocidad media de una moto en ciudad.
 */
export function estimateEtaSeconds(from: GeoPoint, to: GeoPoint, speedKmh = 22): number {
  return Math.round(distanceMeters(from, to) / ((speedKmh * 1000) / 3600));
}
