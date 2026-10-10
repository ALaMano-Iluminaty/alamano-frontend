/**
 * Contrato de eventos que el broker publica hacia el frontend a través del
 * WS Gateway. Un solo sitio donde mirar cuando el backend cambia el contrato.
 *
 * Los nombres siguen los del documento del MVP (VENDOR_LOCATION_UPDATE, …).
 */

import type { GeoPoint } from '@/lib/geo';

export type { GeoPoint };

export const RealtimeEvent = {
  /** 2.1 — un barbero se conectó o se movió. */
  VendorLocationUpdate: 'VENDOR_LOCATION_UPDATE',
  /** 2.1 / 2.2 — dejó de estar disponible (se desconectó o lo reservaron). */
  VendorDisconnected: 'VENDOR_DISCONNECTED',

  /** 4.2 — cambió el stock de una promoción. */
  PromoStockUpdated: 'PROMO_STOCK_UPDATED',

  /** 3.2 — al barbero le asignaron un servicio (un cliente lo reservó). */
  ServiceAssigned: 'SERVICE_ASSIGNED',
  /** 3.1 — el servicio cambió de estado. */
  ServiceStatusChanged: 'SERVICE_STATUS_CHANGED',
  /** 3.1 — posición del barbero durante un servicio activo, con ETA. */
  ServiceLocationUpdate: 'SERVICE_LOCATION_UPDATE',
} as const;

export type RealtimeEventName = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

/** Eventos que el frontend envía al gateway (solo el barbero). */
export const ClientEvent = {
  /** 2.2 — cada posición mientras está "En línea". */
  VendorLocationUpdate: 'VENDOR_LOCATION_UPDATE',
  /** 2.2 — desconexión limpia: sale del mapa de los clientes al momento. */
  VendorOffline: 'VENDOR_OFFLINE',
} as const;

export type ServiceStatus = 'ACCEPTED' | 'ON_THE_WAY' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';

export interface VendorLocationUpdatePayload extends GeoPoint {
  vendorId: string;
  /** Llega cuando el barbero acaba de conectarse y aún no está en el snapshot. */
  name?: string;
  /** ISO 8601. */
  updatedAt: string;
}

export interface VendorDisconnectedPayload {
  vendorId: string;
  reason?: 'OFFLINE' | 'RESERVED';
}

export interface PromoStockUpdatedPayload {
  promoId: string;
  vendorId: string;
  remaining: number;
  total: number;
}

export interface ServiceAssignedPayload {
  serviceId: string;
  customerName: string;
  customerLocation: GeoPoint;
}

export interface ServiceStatusChangedPayload {
  serviceId: string;
  status: ServiceStatus;
  changedAt: string;
}

export interface ServiceLocationUpdatePayload extends GeoPoint {
  serviceId: string;
  /** Segundos hasta la llegada. Opcional: el backend puede no calcularlo. */
  etaSeconds?: number;
  updatedAt: string;
}

/** Mapa evento -> payload. Da tipado a `useRealtime`. */
export interface RealtimeEventPayloads {
  [RealtimeEvent.VendorLocationUpdate]: VendorLocationUpdatePayload;
  [RealtimeEvent.VendorDisconnected]: VendorDisconnectedPayload;
  [RealtimeEvent.PromoStockUpdated]: PromoStockUpdatedPayload;
  [RealtimeEvent.ServiceAssigned]: ServiceAssignedPayload;
  [RealtimeEvent.ServiceStatusChanged]: ServiceStatusChangedPayload;
  [RealtimeEvent.ServiceLocationUpdate]: ServiceLocationUpdatePayload;
}

/** Sobre que envuelve todo mensaje del gateway. */
export interface RealtimeEnvelope<E extends RealtimeEventName = RealtimeEventName> {
  event: E;
  data: RealtimeEventPayloads[E];
  /** ISO 8601, emitido por el broker. */
  emittedAt?: string;
}

export function isRealtimeEnvelope(value: unknown): value is RealtimeEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.event === 'string' && 'data' in candidate;
}
