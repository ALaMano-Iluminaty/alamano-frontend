import { Button } from './Button';

interface ConnectionBannerProps {
  isStale: boolean;
  isRecovering: boolean;
  onRetry: () => void;
}

/** Aviso por pantalla de que lo que se ve puede estar desactualizado. */
export function ConnectionBanner({ isStale, isRecovering, onRetry }: ConnectionBannerProps) {
  if (!isStale) return null;

  return (
    <div className="connection-banner" role="status" aria-live="polite">
      <span>
        {isRecovering
          ? 'Reconectando… lo que ves puede no estar al día.'
          : 'Sin conexión en tiempo real.'}
      </span>
      <Button variant="ghost" onClick={onRetry}>
        Actualizar
      </Button>
    </div>
  );
}
