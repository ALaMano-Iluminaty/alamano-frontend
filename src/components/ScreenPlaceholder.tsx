import { BarberPole } from './BarberPole';

interface ScreenPlaceholderProps {
  title: string;
  /** Rama donde se construye esta pantalla. */
  branch: string;
}

/** Hueco de una pantalla que todavía vive en su propia rama. */
export function ScreenPlaceholder({ title, branch }: ScreenPlaceholderProps) {
  return (
    <section className="placeholder">
      <BarberPole />
      <div>
        <h1 className="placeholder__title">{title}</h1>
        <p className="placeholder__text">
          Esta pantalla se construye en la rama <code>{branch}</code>.
        </p>
      </div>
    </section>
  );
}
