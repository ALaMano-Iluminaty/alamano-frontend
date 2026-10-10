/** "2026-09-17T15:30:00Z" -> "15:30" */
export function formatTime(iso: string, locale = 'es-ES'): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** "hace 3 s" / "hace 2 min" — para la frescura del tracking. */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return 'ahora mismo';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}

/** 320 -> "320 m" · 1840 -> "1,8 km" */
export function formatDistance(meters: number, locale = 'es-ES'): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}

/** Minutos redondeados hacia arriba; nunca promete "0 min" si aún no llegó. */
export function etaMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}
