import { useId, useState, type FormEvent } from 'react';
import { Button, Input, Modal } from '@/components';
import { useToast } from '@/context';
import type { NewPromo } from '../services';

interface CreatePromoModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (promo: NewPromo) => Promise<unknown>;
}

const TITLE_MAX = 40;
const DESCRIPTION_MAX = 120;
const SLOTS_MAX = 100;

export function CreatePromoModal({ open, onClose, onCreate }: CreatePromoModalProps) {
  const { show } = useToast();
  const formId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slots, setSlots] = useState('10');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsNumber = Number(slots);
  const errors = {
    title: !title.trim() ? 'Ponle un nombre corto.' : null,
    description: !description.trim() ? 'Cuenta qué incluye.' : null,
    slots:
      !Number.isInteger(slotsNumber) || slotsNumber < 1 || slotsNumber > SLOTS_MAX
        ? `Entre 1 y ${SLOTS_MAX} cupos.`
        : null,
  };
  const visibleError = (field: keyof typeof errors) => (submitted ? errors[field] : null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSlots('10');
    setSubmitted(false);
    setError(null);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.title || errors.description || errors.slots) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({ title: title.trim(), description: description.trim(), totalSlots: slotsNumber });
      show({ tone: 'success', title: 'Promoción publicada', body: 'Los clientes cercanos ya la ven en tu perfil.' });
      reset();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo publicar la promoción.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Crear promoción"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {saving ? 'Publicando…' : 'Publicar promoción'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(event) => void onSubmit(event)} noValidate>
        <Input
          label="Título"
          value={title}
          maxLength={TITLE_MAX}
          placeholder="Corte + barba"
          onChange={(event) => setTitle(event.target.value)}
          error={visibleError('title') ?? undefined}
          hint={`${title.length}/${TITLE_MAX}`}
        />
        <div className="field">
          <label className="field__label" htmlFor={descriptionId}>
            Descripción
          </label>
          <textarea
            id={descriptionId}
            className={`field__input create-promo__textarea ${visibleError('description') ? 'field__input--error' : ''}`}
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={visibleError('description') ? true : undefined}
            aria-describedby={`${descriptionId}-msg`}
          />
          <p
            id={`${descriptionId}-msg`}
            className={visibleError('description') ? 'field__error' : 'field__hint'}
            role={visibleError('description') ? 'alert' : undefined}
          >
            {visibleError('description') ?? `${description.length}/${DESCRIPTION_MAX}`}
          </p>
        </div>
        <Input
          label="Número de cupos"
          type="number"
          inputMode="numeric"
          min={1}
          max={SLOTS_MAX}
          value={slots}
          onChange={(event) => setSlots(event.target.value)}
          error={visibleError('slots') ?? undefined}
          hint="Cuando se tomen todos, la promoción se muestra como agotada."
        />
        {error ? (
          <p className="panel panel--error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
