import { BarberPole } from '@/components';
import type { ServiceStatus } from '@/lib/realtime';
import { SERVICE_STEPS, statusLabel } from '@/lib/service';

/**
 * En camino → Llegó → Iniciando → Finalizado.
 * El tramo en curso lleva el poste girando: es lo que está pasando ahora.
 * Recién reservado (ACCEPTED) todavía no hay tramo en curso.
 */
export function ServiceStepper({ status }: { status: ServiceStatus }) {
  const current = SERVICE_STEPS.indexOf(status);
  const finished = status === 'COMPLETED';

  return (
    <ol className="stepper">
      {SERVICE_STEPS.map((step, index) => {
        const state = index < current || finished ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li
            key={step}
            className={`stepper__step stepper__step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="stepper__bar" aria-hidden="true">
              {state === 'current' ? <BarberPole orientation="horizontal" spinning /> : null}
            </span>
            <span className="stepper__label">{statusLabel(step)}</span>
          </li>
        );
      })}
    </ol>
  );
}
