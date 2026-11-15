import { loginWithGoogle, type GoogleLoginPayload } from '../services';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * HU-G2: entra con un id_token de Google. Reutiliza {@link useAuthSubmit} para que
 * la carga, el error y la redireccion por rol se comporten igual que con el login
 * clasico. La pantalla pasa al hook lo que reciba el callback de GSI.
 */
export function useGoogleLogin() {
  return useAuthSubmit<GoogleLoginPayload>(loginWithGoogle, 'login');
}
