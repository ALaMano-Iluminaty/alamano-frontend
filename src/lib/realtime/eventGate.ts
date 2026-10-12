import type { GatewayEnvelope } from './gatewayAdapter';

/** eventIds recordados; los más viejos se olvidan primero. */
const MAX_REMEMBERED_EVENTS = 500;

/**
 * Filtro de eventos del Gateway antes de traducirlos.
 *
 * Un mismo evento puede llegar dos veces (por /topic/service.{id} y por
 * /user/queue/services) o desordenado tras una reconexión:
 * - se descarta un `eventId` ya visto;
 * - en `service.status.changed`, se descarta una `version` menor o igual a la
 *   última aplicada para ese servicio.
 */
export class EventGate {
  private readonly seen = new Set<string>();
  private readonly versions = new Map<string, number>();

  accept(envelope: GatewayEnvelope): boolean {
    const { eventId } = envelope;
    if (typeof eventId === 'string') {
      if (this.seen.has(eventId)) return false;
      this.remember(eventId);
    }

    if (envelope.type !== 'service.status.changed') return true;
    const { serviceId, version } = envelope.payload;
    if (typeof serviceId !== 'string' || typeof version !== 'number') return true;

    // La versión empieza en 0: se compara contra undefined, nunca por falsy.
    const applied = this.versions.get(serviceId);
    if (applied !== undefined && version <= applied) return false;
    this.versions.set(serviceId, version);
    return true;
  }

  reset(): void {
    this.seen.clear();
    this.versions.clear();
  }

  private remember(eventId: string): void {
    this.seen.add(eventId);
    if (this.seen.size <= MAX_REMEMBERED_EVENTS) return;
    // Un Set itera en orden de inserción: el primero es el más viejo.
    const oldest = this.seen.values().next().value;
    if (oldest !== undefined) this.seen.delete(oldest);
  }
}
