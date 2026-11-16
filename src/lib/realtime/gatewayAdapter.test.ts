import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isGatewayEnvelope, translateGatewayEvent, type GatewayEnvelope } from './gatewayAdapter';
import { RealtimeEvent } from './events';

function envelope(type: string, payload: Record<string, unknown>): GatewayEnvelope {
  return {
    eventId: 'e1',
    type,
    schemaVersion: 1,
    occurredAt: '2026-11-15T10:00:00Z',
    correlationId: 'c1',
    payload,
  };
}

describe('isGatewayEnvelope', () => {
  it('acepta un sobre con tipo, fecha y payload', () => {
    expect(isGatewayEnvelope(envelope('professional.online', {}))).toBe(true);
  });

  it('rechaza lo que no tiene la forma de un sobre', () => {
    expect(isGatewayEnvelope(null)).toBe(false);
    expect(isGatewayEnvelope('texto')).toBe(false);
    expect(isGatewayEnvelope({ type: 'x', occurredAt: 'y' })).toBe(false);
    expect(isGatewayEnvelope({ type: 'x', occurredAt: 'y', payload: null })).toBe(false);
  });
});

describe('translateGatewayEvent', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('professional.online pasa a VendorLocationUpdate con el nombre opcional', () => {
    const result = translateGatewayEvent(
      envelope('professional.online', { professionalId: 'p1', latitude: 4.6, longitude: -74.1, name: 'Luis' }),
    );
    expect(result).toEqual({
      event: RealtimeEvent.VendorLocationUpdate,
      data: { vendorId: 'p1', lat: 4.6, lng: -74.1, updatedAt: '2026-11-15T10:00:00Z', name: 'Luis' },
    });
  });

  it('professional.online incompleto se ignora', () => {
    expect(translateGatewayEvent(envelope('professional.online', { professionalId: 'p1' }))).toBeNull();
  });

  it('professional.disconnected pasa a VendorDisconnected', () => {
    expect(translateGatewayEvent(envelope('professional.disconnected', { professionalId: 'p1' }))).toEqual({
      event: RealtimeEvent.VendorDisconnected,
      data: { vendorId: 'p1', reason: 'OFFLINE' },
    });
    expect(translateGatewayEvent(envelope('professional.disconnected', {}))).toBeNull();
  });

  it('service.status.changed trae estado, versión y participantes', () => {
    const result = translateGatewayEvent(
      envelope('service.status.changed', {
        serviceId: 's1',
        status: 'EN_ROUTE',
        previousStatus: 'RESERVED',
        professionalId: 'p1',
        clientId: 'c9',
        version: 3,
      }),
    );
    expect(result?.event).toBe(RealtimeEvent.ServiceStatusChanged);
    expect(result?.data).toMatchObject({
      serviceId: 's1',
      professionalId: 'p1',
      clientId: 'c9',
      version: 3,
      changedAt: '2026-11-15T10:00:00Z',
    });
  });

  it('service.status.changed sin estado anterior ni extras sigue siendo válido', () => {
    const result = translateGatewayEvent(envelope('service.status.changed', { serviceId: 's1', status: 'RESERVED' }));
    expect(result?.data).toMatchObject({ serviceId: 's1', previousStatus: null });
  });

  it('service.status.changed incompleto se ignora', () => {
    expect(translateGatewayEvent(envelope('service.status.changed', { serviceId: 's1' }))).toBeNull();
  });

  it('tracking.updated usa recordedAt y el ETA si vienen', () => {
    const result = translateGatewayEvent(
      envelope('tracking.updated', {
        serviceId: 's1',
        latitude: 4.7,
        longitude: -74.2,
        etaSeconds: 240,
        recordedAt: '2026-11-15T09:59:58Z',
      }),
    );
    expect(result).toEqual({
      event: RealtimeEvent.ServiceLocationUpdate,
      data: { serviceId: 's1', lat: 4.7, lng: -74.2, updatedAt: '2026-11-15T09:59:58Z', etaSeconds: 240 },
    });
  });

  it('tracking.updated sin recordedAt usa la hora del sobre y no inventa ETA', () => {
    const result = translateGatewayEvent(envelope('tracking.updated', { serviceId: 's1', latitude: 1, longitude: 2 }));
    expect(result?.data).toEqual({ serviceId: 's1', lat: 1, lng: 2, updatedAt: '2026-11-15T10:00:00Z' });
    expect(translateGatewayEvent(envelope('tracking.updated', { serviceId: 's1' }))).toBeNull();
  });

  it('ignora los tipos que no conoce', () => {
    expect(translateGatewayEvent(envelope('algo.raro', {}))).toBeNull();
  });
});
