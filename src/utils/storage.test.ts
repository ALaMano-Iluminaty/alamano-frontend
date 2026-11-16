import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStorage, removeStorage, writeStorage } from './storage';

describe('storage', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('guarda y lee un valor JSON', () => {
    writeStorage('k', { a: 1 });
    expect(readStorage('k', null)).toEqual({ a: 1 });
  });

  it('devuelve el valor de respaldo si la clave no existe', () => {
    expect(readStorage('no-existe', 'respaldo')).toBe('respaldo');
  });

  it('devuelve el respaldo si el contenido no es JSON válido', () => {
    window.localStorage.setItem('roto', '{no-json');
    expect(readStorage('roto', 'respaldo')).toBe('respaldo');
  });

  it('borra una clave', () => {
    writeStorage('k', 1);
    removeStorage('k');
    expect(readStorage('k', 'vacío')).toBe('vacío');
  });

  it('no lanza si el almacenamiento está bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readStorage('k', 'respaldo')).toBe('respaldo');
    expect(() => writeStorage('k', 1)).not.toThrow();
    expect(() => removeStorage('k')).not.toThrow();
  });
});
