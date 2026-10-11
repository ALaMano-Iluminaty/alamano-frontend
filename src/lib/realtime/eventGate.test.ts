import { describe, expect, it } from 'vitest';
import { EventGate } from './eventGate';
import type { GatewayEnvelope } from './gatewayAdapter';

function statusEvent(eventId: string, version: number, serviceId = 'svc-1'): GatewayEnvelope {
  return {
    eventId,
    type: 'service.status.changed',
    schemaVersion: 1,
    occurredAt: '2026-10-11T10:00:00Z',
    correlationId: 'corr-1',
    payload: { serviceId, professionalId: 'pro-1', clientId: 'cli-1', status: 'RESERVED', version },
  };
}

describe('EventGate', () => {
  it('descarta un eventId ya visto', () => {
    const gate = new EventGate();
    expect(gate.accept(statusEvent('e-1', 0))).toBe(true);
    expect(gate.accept(statusEvent('e-1', 0))).toBe(false);
  });

  it('acepta la versión 0 como primer evento del servicio', () => {
    const gate = new EventGate();
    expect(gate.accept(statusEvent('e-1', 0))).toBe(true);
  });

  it('descarta versiones menores o iguales a la ya aplicada', () => {
    const gate = new EventGate();
    expect(gate.accept(statusEvent('e-1', 0))).toBe(true);
    expect(gate.accept(statusEvent('e-2', 2))).toBe(true);
    expect(gate.accept(statusEvent('e-3', 1))).toBe(false);
    expect(gate.accept(statusEvent('e-4', 2))).toBe(false);
    expect(gate.accept(statusEvent('e-5', 3))).toBe(true);
  });

  it('lleva la versión por servicio', () => {
    const gate = new EventGate();
    expect(gate.accept(statusEvent('e-1', 5, 'svc-1'))).toBe(true);
    expect(gate.accept(statusEvent('e-2', 0, 'svc-2'))).toBe(true);
  });

  it('no aplica la versión a otros tipos de evento', () => {
    const gate = new EventGate();
    expect(gate.accept(statusEvent('e-1', 3))).toBe(true);
    const tracking: GatewayEnvelope = {
      ...statusEvent('e-2', 1),
      type: 'tracking.updated',
      payload: { serviceId: 'svc-1', latitude: 4.6, longitude: -74.1, version: 1 },
    };
    expect(gate.accept(tracking)).toBe(true);
  });

  it('olvida todo con reset', () => {
    const gate = new EventGate();
    gate.accept(statusEvent('e-1', 4));
    gate.reset();
    expect(gate.accept(statusEvent('e-1', 0))).toBe(true);
  });
});
