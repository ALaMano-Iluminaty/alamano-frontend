import { login } from '../services';
import { useAuthSubmit } from './useAuthSubmit';

export function useLogin() {
  return useAuthSubmit(login, 'login');
}
