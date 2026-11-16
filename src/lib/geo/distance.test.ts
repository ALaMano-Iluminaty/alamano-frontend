import { describe, expect, it } from 'vitest';
import { DEFAULT_CENTER, distanceMeters, estimateEtaSeconds, interpolate } from './distance';

// 0,009 grados de latitud son unos 1.000 m sobre la superficie terrestre.
const ONE_KM_NORTH = { lat: DEFAULT_CENTER.lat + 0.009, lng: DEFAULT_CENTER.lng };

describe('distanceMeters', () => {
  it('es cero entre un punto y él mismo', () => {
    expect(distanceMeters(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0);
  });

  it('mide cerca de 1 km para 0,009 grados de latitud', () => {
    expect(distanceMeters(DEFAULT_CENTER, ONE_KM_NORTH)).toBeGreaterThan(990);
    expect(distanceMeters(DEFAULT_CENTER, ONE_KM_NORTH)).toBeLessThan(1010);
  });

  it('es simétrica', () => {
    expect(distanceMeters(DEFAULT_CENTER, ONE_KM_NORTH)).toBeCloseTo(
      distanceMeters(ONE_KM_NORTH, DEFAULT_CENTER),
      6,
    );
  });
});

describe('interpolate', () => {
  const from = { lat: 0, lng: 0 };
  const to = { lat: 10, lng: -20 };

  it('devuelve los extremos con fracción 0 y 1', () => {
    expect(interpolate(from, to, 0)).toEqual(from);
    expect(interpolate(from, to, 1)).toEqual(to);
  });

  it('devuelve el punto medio con fracción 0,5', () => {
    expect(interpolate(from, to, 0.5)).toEqual({ lat: 5, lng: -10 });
  });
});

describe('estimateEtaSeconds', () => {
  it('estima unos 164 s para 1 km a 22 km/h', () => {
    const eta = estimateEtaSeconds(DEFAULT_CENTER, ONE_KM_NORTH);
    expect(eta).toBeGreaterThan(160);
    expect(eta).toBeLessThan(168);
  });

  it('tarda la mitad si la velocidad se duplica', () => {
    const slow = estimateEtaSeconds(DEFAULT_CENTER, ONE_KM_NORTH, 20);
    const fast = estimateEtaSeconds(DEFAULT_CENTER, ONE_KM_NORTH, 40);
    expect(fast).toBeLessThan(slow);
    expect(Math.abs(slow - fast * 2)).toBeLessThanOrEqual(1);
  });

  it('es cero si origen y destino coinciden', () => {
    expect(estimateEtaSeconds(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0);
  });
});
