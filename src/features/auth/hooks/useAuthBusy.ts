import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

interface AuthOutletContext {
  setBusy?: (busy: boolean) => void;
}

/** Avisa al layout de que hay un envío en vuelo (el poste gira mientras tanto). */
export function useAuthBusy(busy: boolean): void {
  const context = useOutletContext<AuthOutletContext | undefined>();
  const setBusy = context?.setBusy;

  useEffect(() => {
    setBusy?.(busy);
    return () => setBusy?.(false);
  }, [busy, setBusy]);
}
