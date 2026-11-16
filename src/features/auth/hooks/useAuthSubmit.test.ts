import { describe, expect, it } from 'vitest';
import { destinationFor } from './useAuthSubmit';

describe('destinationFor', () => {
  it('lleva a cada rol a su inicio cuando no venia de ninguna pantalla', () => {
    expect(destinationFor('CUSTOMER', undefined)).toBe('/map');
    expect(destinationFor('SELLER', undefined)).toBe('/seller/dashboard');
    expect(destinationFor('ADMIN', undefined)).toBe('/admin/users');
  });

  it('vuelve a la pantalla que intentaba abrir si es de su rol', () => {
    expect(destinationFor('CUSTOMER', '/tracking/abc')).toBe('/tracking/abc');
    expect(destinationFor('SELLER', '/seller/service/9')).toBe('/seller/service/9');
    expect(destinationFor('ADMIN', '/admin/users')).toBe('/admin/users');
  });

  it('ignora una pantalla que no es de su rol', () => {
    expect(destinationFor('CUSTOMER', '/seller/dashboard')).toBe('/map');
    expect(destinationFor('SELLER', '/map')).toBe('/seller/dashboard');
    expect(destinationFor('ADMIN', '/map')).toBe('/admin/users');
  });

  it('ignora un origen que no es texto', () => {
    expect(destinationFor('SELLER', { path: '/seller' })).toBe('/seller/dashboard');
  });
});
