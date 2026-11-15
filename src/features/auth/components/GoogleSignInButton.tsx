import { useEffect, useRef, useState } from 'react';

/** Cliente ID de la aplicacion Web de Google Cloud (ver docs/topologia-4-vms.md). */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  /** Que hacer con el id_token cuando el usuario elige una cuenta. */
  onCredential: (idToken: string) => void;
  /**
   * Texto del boton. Google provee 4 opciones oficiales; usamos {@code continue_with}
   * por defecto porque funciona para login y registro sin cambiar el copy.
   */
  text?: GoogleButtonOptions['text'];
  /** Deshabilita el boton (p. ej. mientras una peticion al backend esta en curso). */
  disabled?: boolean;
}

/**
 * HU-G2: boton oficial de Google. El SDK se carga desde index.html; aqui esperamos
 * a que window.google este disponible y pedimos a la libreria que pinte su propio
 * boton dentro de nuestro contenedor. El id_token nunca toca el estado de React
 * directamente: va a {@link onCredential} que es quien lo manda al backend.
 */
export function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
  disabled = false,
}: GoogleSignInButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(() => Boolean(window.google?.accounts?.id));

  // Espera a que el <script> async termine. Sondear cada 150 ms tiene coste
  // despreciable y evita que un orden de carga raro deje el boton en blanco.
  useEffect(() => {
    if (sdkReady) return;
    const id = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        setSdkReady(true);
        window.clearInterval(id);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [sdkReady]);

  useEffect(() => {
    if (!sdkReady || !container.current || !CLIENT_ID) return;
    const node = container.current;
    node.innerHTML = '';
    window.google!.accounts.id.initialize({
      client_id: CLIENT_ID,
      // La libreria entrega el JWT en el campo credential; se lo pasamos al padre.
      callback: (response) => {
        if (response?.credential) onCredential(response.credential);
      },
      // Evita que el popup se reabra solo cuando el usuario cerro sesion.
      auto_select: false,
      ux_mode: 'popup',
    });
    window.google!.accounts.id.renderButton(node, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'pill',
      width: '320',
      logo_alignment: 'left',
    });
  }, [sdkReady, onCredential, text]);

  // Sin Client ID la aplicacion sigue funcionando (login clasico), pero el boton
  // no debe aparecer como clicable: seria un 401 asegurado. Explicitar el motivo
  // ayuda a QA y a la persona que haga el despliegue.
  if (!CLIENT_ID) {
    return (
      <p className="auth-form__google-missing" role="status">
        Falta configurar <code>VITE_GOOGLE_CLIENT_ID</code> para activar el ingreso con Google.
      </p>
    );
  }

  return (
    <div
      className="auth-form__google"
      aria-busy={!sdkReady}
      aria-disabled={disabled}
      // Visualmente apagado cuando hay una peticion en curso para evitar doble envio.
      style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      <div ref={container} data-testid="google-signin-button" />
      {!sdkReady ? (
        <p className="auth-form__google-loading">Cargando el acceso con Google…</p>
      ) : null}
    </div>
  );
}
