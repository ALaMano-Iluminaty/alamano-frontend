import { describe, expect, it } from 'vitest';
import { tokenSubject } from './jwt';

function encode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

describe('tokenSubject', () => {
  it('lee el sub del payload (base64url sin relleno)', () => {
    expect(tokenSubject(`${encode({ alg: 'RS256' })}.${encode({ sub: 'pro-demo', role: 'PROFESSIONAL' })}.firma`)).toBe(
      'pro-demo',
    );
  });

  it('devuelve null si el token no es un JWT legible (modo demo)', () => {
    expect(tokenSubject('demo.YWJj.access')).toBeNull();
    expect(tokenSubject('sin-puntos')).toBeNull();
  });

  it('devuelve null si no hay sub', () => {
    expect(tokenSubject(`${encode({})}.${encode({ role: 'CLIENT' })}.x`)).toBeNull();
  });
});
