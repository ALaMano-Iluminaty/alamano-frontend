import { loginWithGoogle, type GoogleLoginPayload } from '../services';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * HU-Q2: entra con un id_token de Google. Reutiliza {@link useAuthSubmit} para la
 * carga, el error y la redireccion por rol. La pantalla le pasa lo que entregue el
 * callback de Google Identity Services.
 */
export function useGoogleLogin() {
  return useAuthSubmit<GoogleLoginPayload>(loginWithGoogle);
}
