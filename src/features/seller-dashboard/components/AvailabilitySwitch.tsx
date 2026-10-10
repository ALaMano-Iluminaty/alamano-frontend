import { BarberPole } from '@/components';

interface AvailabilitySwitchProps {
  online: boolean;
  onToggle: () => void;
}

/**
 * El interruptor En línea / Desconectado. El carril es un poste de barbería:
 * gira mientras la ubicación se está transmitiendo.
 */
export function AvailabilitySwitch({ online, onToggle }: AvailabilitySwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      className={`availability ${online ? 'availability--on' : ''}`}
      onClick={onToggle}
    >
      <span className="availability__track" aria-hidden="true">
        <BarberPole orientation="horizontal" spinning={online} className="availability__pole" />
        <span className="availability__knob" />
      </span>
      <span className="availability__text">
        <span className="availability__state">{online ? 'En línea' : 'Desconectado'}</span>
        <span className="availability__detail">
          {online
            ? 'Disponible: los clientes cercanos te ven en el mapa.'
            : 'No apareces en el mapa. Actívalo para recibir clientes.'}
        </span>
      </span>
    </button>
  );
}
