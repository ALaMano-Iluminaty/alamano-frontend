import { Button } from '@/components';
import type { Promo } from '../services';

interface PromoTicketProps {
  promo: Promo;
  claiming: boolean;
  disabled: boolean;
  onClaim: () => void;
}

/**
 * Promoción como ticket de turno: a la derecha, el talón con los cupos que
 * quedan. El número cambia en vivo con PROMO_STOCK_UPDATED.
 */
export function PromoTicket({ promo, claiming, disabled, onClaim }: PromoTicketProps) {
  const soldOut = promo.remaining <= 0;
  const low = !soldOut && promo.remaining <= 2;

  return (
    <li className={`ticket ${soldOut ? 'ticket--sold-out' : ''}`}>
      <div className="ticket__body">
        <h3 className="ticket__title">{promo.title}</h3>
        <p className="ticket__text">{promo.description}</p>
        <Button
          variant={soldOut ? 'secondary' : 'primary'}
          className="ticket__action"
          loading={claiming}
          disabled={soldOut || disabled}
          onClick={onClaim}
        >
          {soldOut ? 'Agotada' : claiming ? 'Tomando…' : 'Reclamar promoción'}
        </Button>
      </div>
      <div className="ticket__stub" aria-live="polite">
        {/* key: el número "salta" al cambiar, para que se note la actualización */}
        <span key={promo.remaining} className={`ticket__count ${low ? 'ticket__count--low' : ''}`}>
          {promo.remaining}
        </span>
        <span className="ticket__of">de {promo.total} cupos</span>
      </div>
    </li>
  );
}
