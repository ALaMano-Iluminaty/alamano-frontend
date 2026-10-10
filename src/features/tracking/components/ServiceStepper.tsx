import { BarberPole } from '@/components';
import type { ServiceStatus } from '@/lib/realtime';
import { SERVICE_FLOW, SERVICE_STATUS_LABEL, stepIndex } from '@/lib/service';

/**
 * Aceptado → En camino → En el sitio → Completado.
 * El tramo en curso lleva el poste girando: es lo que está pasando ahora.
 */
export function ServiceStepper({ status }: { status: ServiceStatus }) {
  const current = stepIndex(status);
  const finished = status === 'COMPLETED';

  return (
    <ol className="stepper">
      {SERVICE_FLOW.map((step, index) => {
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
            <span className="stepper__label">{SERVICE_STATUS_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
