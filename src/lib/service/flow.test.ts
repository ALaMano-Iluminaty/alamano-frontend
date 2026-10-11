import { describe, expect, it } from 'vitest';
import { forwardStatus } from './flow';

describe('forwardStatus', () => {
  it('usa allowedTransitions como conjunto: el orden no importa', () => {
    expect(forwardStatus('ACCEPTED', ['CANCELLED', 'ON_THE_WAY'])).toBe('ON_THE_WAY');
    expect(forwardStatus('ACCEPTED', ['ON_THE_WAY', 'CANCELLED'])).toBe('ON_THE_WAY');
  });

  it('nunca ofrece cancelar como paso hacia adelante', () => {
    expect(forwardStatus('ACCEPTED', ['CANCELLED'])).toBeNull();
  });

  it('sin transiciones permitidas no hay botón', () => {
    expect(forwardStatus('ON_THE_WAY', [])).toBeNull();
  });

  it('separa ARRIVED de IN_PROGRESS', () => {
    expect(forwardStatus('ARRIVED', ['IN_PROGRESS'])).toBe('IN_PROGRESS');
    expect(forwardStatus('IN_PROGRESS', ['COMPLETED'])).toBe('COMPLETED');
  });

  it('sin allowedTransitions (modo demo) sigue el flujo local', () => {
    expect(forwardStatus('ARRIVED')).toBe('IN_PROGRESS');
    expect(forwardStatus('COMPLETED')).toBeNull();
  });
});
