import { register } from '../services';
import { useAuthSubmit } from './useAuthSubmit';

export function useRegister() {
  return useAuthSubmit(register, 'register');
}
