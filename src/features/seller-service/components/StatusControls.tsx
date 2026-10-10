import { Button } from '@/components';
import type { ServiceStatus } from '@/lib/realtime';
import { stepIndex } from '@/lib/service';

interface StatusControlsProps {
  status: ServiceStatus;
  advancing: boolean;
  onAdvance: () => void;
}

/** Los tres pasos que controla el barbero, en el único orden posible. */
const STEPS: { to: ServiceStatus; action: string; done: string; hint: string }[] = [
  {
    to: 'ON_THE_WAY',
    action: 'Iniciar trayecto',
    done: 'Trayecto iniciado',
    hint: 'El cliente empezará a ver tu ubicación.',
  },
  {
    to: 'ARRIVED',
    action: 'Llegué a la ubicación',
    done: 'Llegaste',
    hint: 'Tu ubicación deja de compartirse.',
  },
  {
    to: 'COMPLETED',
    action: 'Finalizar servicio',
    done: 'Servicio finalizado',
    hint: 'Cierra el servicio y vuelves a tu panel.',
  },
];

/**
 * Máquina de estados en la UI: solo el paso siguiente tiene botón activo.
 * Los anteriores quedan marcados como hechos y los posteriores bloqueados
 * con el motivo, así no hay forma de saltarse uno.
 */
export function StatusControls({ status, advancing, onAdvance }: StatusControlsProps) {
  const current = stepIndex(status);

  return (
    <ol className="controls">
      {STEPS.map((step, index) => {
        const target = stepIndex(step.to);
        const done = target <= current;
        const isNext = target === current + 1;

        if (done) {
          return (
            <li key={step.to} className="controls__step controls__step--done">
              <span className="controls__check" aria-hidden="true">
                ✓
              </span>
              {step.done}
            </li>
          );
        }

        if (isNext) {
          return (
            <li key={step.to} className="controls__step controls__step--next">
              <Button className="controls__action" loading={advancing} onClick={onAdvance}>
                {advancing ? 'Guardando…' : step.action}
              </Button>
              <p className="controls__hint">{step.hint}</p>
            </li>
          );
        }

        return (
          <li key={step.to} className="controls__step controls__step--locked">
            <button type="button" className="controls__locked" disabled>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              {step.action}
            </button>
            <span className="visually-hidden">
              Disponible después de «{STEPS[index - 1]?.action ?? ''}»
            </span>
          </li>
        );
      })}
    </ol>
  );
}
