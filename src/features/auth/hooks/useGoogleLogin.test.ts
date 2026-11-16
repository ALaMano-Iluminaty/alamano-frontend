// HU-Q2: el hook debe reusar useAuthSubmit con loginWithGoogle. No probamos la
// red (de eso se ocupa services.test.ts): aqui solo que el hook entregue la funcion correcta.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as submitModule from './useAuthSubmit';
import { useGoogleLogin } from './useGoogleLogin';
import * as services from '../services';

describe('useGoogleLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('usa loginWithGoogle en useAuthSubmit', () => {
    const spy = vi
      .spyOn(submitModule, 'useAuthSubmit')
      .mockReturnValue({ submit: vi.fn(), loading: false, error: null } as never);

    useGoogleLogin();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(services.loginWithGoogle);
  });
});
