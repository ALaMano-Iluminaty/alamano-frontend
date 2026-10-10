interface BarberPoleProps {
  /** Gira mientras algo está "vivo": en línea, GPS transmitiendo, en camino. */
  spinning?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * La firma visual de la app: la franja del poste de barbería.
 *
 * Solo gira cuando hay algo transmitiéndose en tiempo real, así que el
 * movimiento siempre significa lo mismo. Decorativo para lectores de
 * pantalla: el estado real lo dice el texto que lo acompaña.
 */
export function BarberPole({ spinning = false, orientation = 'vertical', className = '' }: BarberPoleProps) {
  return (
    <span
      aria-hidden="true"
      className={`pole pole--${orientation} ${spinning ? 'pole--spinning' : 'pole--still'} ${className}`.trim()}
    >
      <span className="pole__glass" />
    </span>
  );
}
