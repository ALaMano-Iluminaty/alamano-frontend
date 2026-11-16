import { describe, expect, it } from 'vitest';
import { etaMinutes, formatDistance, formatRelative, formatTime } from './format';

describe('formatTime', () => {
  it('devuelve horas y minutos', () => {
    expect(formatTime('2026-09-17T15:30:00Z')).toMatch(/^\d{1,2}:\d{2}/);
  });
});

describe('formatRelative', () => {
  const base = '2026-01-01T00:00:00Z';
  const at = (seconds: number) => new Date(base).getTime() + seconds * 1000;

  it('dice "ahora mismo" por debajo de 5 s', () => {
    expect(formatRelative(base, at(2))).toBe('ahora mismo');
  });

  it('usa segundos, minutos y horas según el tiempo transcurrido', () => {
    expect(formatRelative(base, at(30))).toBe('hace 30 s');
    expect(formatRelative(base, at(120))).toBe('hace 2 min');
    expect(formatRelative(base, at(2 * 3600))).toBe('hace 2 h');
  });
});

describe('formatDistance', () => {
  it('redondea a decenas de metros por debajo de 1 km', () => {
    expect(formatDistance(324)).toBe('320 m');
  });

  it('pasa a kilómetros desde 1.000 m', () => {
    expect(formatDistance(1840)).toMatch(/^1[.,]8 km$/);
  });
});

describe('etaMinutes', () => {
  it('nunca promete 0 minutos', () => {
    expect(etaMinutes(0)).toBe(1);
    expect(etaMinutes(59)).toBe(1);
  });

  it('redondea hacia arriba', () => {
    expect(etaMinutes(61)).toBe(2);
    expect(etaMinutes(300)).toBe(5);
  });
});
