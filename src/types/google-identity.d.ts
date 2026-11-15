// Tipos minimos de Google Identity Services. La libreria se carga con un <script>
// en index.html (HU-G2). Esto es lo que usamos del SDK; cualquier otra API queda
// fuera del contrato para que TypeScript nos avise si se usa algo distinto.
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: GoogleIdConfig): void;
          renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
          prompt(listener?: (notification: GooglePromptNotification) => void): void;
          disableAutoSelect(): void;
          cancel(): void;
        };
      };
    };
  }

  interface GoogleIdConfig {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }

  interface GoogleButtonOptions {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number | string;
    locale?: string;
  }

  interface GoogleCredentialResponse {
    // El id_token JWT firmado por Google. Esto es lo que mandamos al backend.
    credential: string;
    select_by?: string;
    clientId?: string;
  }

  interface GooglePromptNotification {
    isNotDisplayed(): boolean;
    isSkippedMoment(): boolean;
    getNotDisplayedReason(): string;
    getSkippedReason(): string;
  }
}
