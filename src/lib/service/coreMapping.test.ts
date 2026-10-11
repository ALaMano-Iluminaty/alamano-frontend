import { describe, expect, it } from 'vitest';
import { toCoreStatus, toFrontStatus, toServiceDetail, type CoreServiceDto } from './coreMapping';

describe('coreMapping', () => {
  it('separa ARRIVED de IN_PROGRESS', () => {
    expect(toFrontStatus('ARRIVED')).toBe('ARRIVED');
    expect(toFrontStatus('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(toCoreStatus('IN_PROGRESS')).toBe('IN_PROGRESS');
  });

  it('deja pasar un estado desconocido tal cual', () => {
    expect(toFrontStatus('PAUSED')).toBe('PAUSED');
  });

  it('traduce allowedTransitions del Core', () => {
    const dto: CoreServiceDto = {
      id: 'svc-1',
      professionalId: 'pro-123456',
      clientId: 'cli-123456',
      status: 'RESERVED',
      updatedAt: '2026-10-11T10:00:00Z',
      destinationLatitude: 4.65,
      destinationLongitude: -74.06,
      allowedTransitions: ['EN_ROUTE', 'CANCELLED'],
    };
    expect(toServiceDetail(dto).allowedTransitions).toEqual(['ON_THE_WAY', 'CANCELLED']);
  });
});
