import { describe, expect, it } from 'vitest';
import { homePathFor } from './SessionContext';

describe('homePathFor', () => {
  it('lleva a cada rol a su pantalla de inicio', () => {
    expect(homePathFor('CUSTOMER')).toBe('/map');
    expect(homePathFor('SELLER')).toBe('/seller/dashboard');
    expect(homePathFor('ADMIN')).toBe('/admin/users');
  });
});
