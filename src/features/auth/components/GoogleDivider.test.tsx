// @vitest-environment jsdom
// HU-G2: el separador "o" es presentacion, pero validamos que exponga el role
// semantico correcto para lectores de pantalla.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GoogleDivider } from './GoogleDivider';

describe('GoogleDivider', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('se renderiza con role separator y orientacion horizontal', () => {
    const root = createRoot(container);
    act(() => {
      root.render(<GoogleDivider />);
    });

    const sep = container.querySelector('[role="separator"]');
    expect(sep).not.toBeNull();
    expect(sep?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(sep?.textContent).toBe('o');

    act(() => {
      root.unmount();
    });
  });
});
