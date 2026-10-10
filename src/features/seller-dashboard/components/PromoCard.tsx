import type { MyPromo } from '../services';

interface PromoCardProps {
  promo: MyPromo;
  /** Acaba de llegar un PROMO_STOCK_UPDATED para esta promo. */
  flash: boolean;
}

/** Promoción propia con el contador de cupos que consumen los clientes en vivo. */
export function PromoCard({ promo, flash }: PromoCardProps) {
  const taken = promo.total - promo.remaining;
  const soldOut = promo.remaining <= 0;
  const percent = promo.total > 0 ? (taken / promo.total) * 100 : 0;

  return (
    <li className={`my-promo ${flash ? 'my-promo--flash' : ''} ${soldOut ? 'my-promo--sold-out' : ''}`}>
      <div className="my-promo__head">
        <div>
          <h3 className="my-promo__title">{promo.title}</h3>
          <p className="my-promo__text">{promo.description}</p>
        </div>
        <p className="my-promo__counter" aria-live="polite">
          <span key={promo.remaining} className="my-promo__remaining">
            {promo.remaining}
          </span>
          <span className="my-promo__total">/ {promo.total}</span>
          <span className="visually-hidden"> cupos disponibles</span>
        </p>
      </div>
      <div
        className="my-promo__meter"
        role="progressbar"
        aria-label="Cupos tomados"
        aria-valuemin={0}
        aria-valuemax={promo.total}
        aria-valuenow={taken}
      >
        <span className="my-promo__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="my-promo__foot">
        {soldOut ? 'Agotada: todos los cupos se tomaron.' : `${taken} tomados · quedan ${promo.remaining}`}
      </p>
    </li>
  );
}
