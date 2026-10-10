/**
 * Traducción entre el contrato del Realtime Gateway y el contrato interno.
 *
 * Las features solo conocen los eventos de `events.ts` (VENDOR_LOCATION_UPDATE,
 * vendorId, lat, lng…). Cuando el Gateway cambie su contrato, este archivo es
 * lo único que se toca.
 */

import { RealtimeEvent, type RealtimeEventName, type RealtimeEventPayloads } from './events';

/** Sobre de todo mensaje publicado por el Gateway en /topic/map. */
export interface GatewayEnvelope {
  eventId: string;
  type: string;
  schemaVersion: number;
  /** ISO 8601. */
  occurredAt: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface TranslatedEvent<E extends RealtimeEventName = RealtimeEventName> {
  event: E;
  data: RealtimeEventPayloads[E];
}

export function isGatewayEnvelope(value: unknown): value is GatewayEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function translateOnline(envelope: GatewayEnvelope): TranslatedEvent | null {
  const { professionalId, latitude, longitude, name } = envelope.payload;
  if (typeof professionalId !== 'string' || !isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    console.warn('[realtime] professional.online sin professionalId/latitude/longitude:', envelope);
    return null;
  }
  return {
    event: RealtimeEvent.VendorLocationUpdate,
    data: {
      vendorId: professionalId,
      lat: latitude,
      lng: longitude,
      updatedAt: envelope.occurredAt,
      ...(typeof name === 'string' ? { name } : {}),
    },
  };
}

function translateDisconnected(envelope: GatewayEnvelope): TranslatedEvent | null {
  const { professionalId } = envelope.payload;
  if (typeof professionalId !== 'string') {
    console.warn('[realtime] professional.disconnected sin professionalId:', envelope);
    return null;
  }
  return {
    event: RealtimeEvent.VendorDisconnected,
    data: { vendorId: professionalId, reason: 'OFFLINE' },
  };
}

/**
 * Convierte un evento del Gateway al formato interno. null = se ignora.
 * Los eventos de servicio (service.status.changed, tracking.updated) aún no
 * se traducen.
 */
export function translateGatewayEvent(envelope: GatewayEnvelope): TranslatedEvent | null {
  switch (envelope.type) {
    case 'professional.online':
      return translateOnline(envelope);
    case 'professional.disconnected':
      return translateDisconnected(envelope);
    default:
      // eslint-disable-next-line no-console
      console.debug('[realtime] evento del Gateway sin traducción, se ignora:', envelope.type);
      return null;
  }
}
