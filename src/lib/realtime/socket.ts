import { Client, ReconnectionTimeMode, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { USE_MOCKS } from '@/lib/mock';
import type { RealtimeEventName, RealtimeEventPayloads } from './events';
import { isGatewayEnvelope, translateGatewayEvent } from './gatewayAdapter';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

type Listener<E extends RealtimeEventName> = (payload: RealtimeEventPayloads[E]) => void;
type StatusListener = (status: ConnectionStatus) => void;

const WS_URL = import.meta.env.VITE_WS_GATEWAY_URL ?? '/ws';

/** Eventos del mapa: professional.online y professional.disconnected. */
const MAP_TOPIC = '/topic/map';
/** Errores dirigidos a este usuario. */
const ERRORS_QUEUE = '/user/queue/errors';
/** Eventos de un servicio: service.status.changed y tracking.updated. */
const SERVICE_TOPIC_PREFIX = '/topic/service.';

/** Los mismos que anuncia el Gateway. */
const HEARTBEAT_MS = 10_000;

/** 6.4 — backoff exponencial para no martillar al Gateway. */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/** STOMP necesita una URL absoluta: `/ws` se completa con el host actual. */
function brokerUrl(): string {
  if (!WS_URL.startsWith('/')) return WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${WS_URL}`;
}

/**
 * Única conexión en tiempo real de la app.
 *
 * Por dentro habla STOMP con el Realtime Gateway y traduce sus eventos al
 * contrato interno (ver gatewayAdapter.ts). Hacia fuera la API no cambia:
 * `useRealtime` y las features no saben que hay STOMP debajo.
 */
class RealtimeSocket {
  private client: Client | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = 'idle';
  /** Cierre pedido por nosotros o token rechazado: no reconectar. */
  private intentionallyClosed = false;

  private readonly listeners = new Map<string, Set<Listener<RealtimeEventName>>>();
  private readonly statusListeners = new Set<StatusListener>();

  /** Servicios que alguna pantalla quiere escuchar, con cuántas pantallas lo piden. Es la fuente de verdad para re-suscribir. */
  private readonly watchedServices = new Map<string, number>();
  /** Suscripciones STOMP vivas de la conexión actual. */
  private readonly serviceSubs = new Map<string, StompSubscription>();

  connect(token: string | null): void {
    this.token = token;
    this.intentionallyClosed = false;

    // En modo demo no hay gateway: el socket se da por abierto y los eventos
    // los inyectan los mocks con `dispatch`.
    if (USE_MOCKS) {
      this.setStatus('open');
      return;
    }

    if (this.client?.active) return;

    this.setStatus('connecting');
    this.client = this.createClient();
    this.client.activate();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    const client = this.client;
    this.client = null;
    void client?.deactivate();
    this.serviceSubs.clear();
    this.setStatus('closed');
  }

  /** Suscribe a un evento. Devuelve la función para desuscribirse. */
  on<E extends RealtimeEventName>(event: E, listener: Listener<E>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener<RealtimeEventName>>();
    set.add(listener as Listener<RealtimeEventName>);
    this.listeners.set(event, set);
    return () => {
      set.delete(listener as Listener<RealtimeEventName>);
      if (set.size === 0) this.listeners.delete(event);
    };
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Escucha un servicio. Devuelve la función para dejar de escucharlo. */
  watchService(serviceId: string): () => void {
    this.watchedServices.set(serviceId, (this.watchedServices.get(serviceId) ?? 0) + 1);
    this.subscribeService(serviceId);
    return () => {
      const remaining = (this.watchedServices.get(serviceId) ?? 1) - 1;
      if (remaining > 0) {
        this.watchedServices.set(serviceId, remaining);
        return;
      }
      this.watchedServices.delete(serviceId);
      const subscription = this.serviceSubs.get(serviceId);
      this.serviceSubs.delete(serviceId);
      if (subscription && this.client?.connected) subscription.unsubscribe();
    };
  }

  private subscribeService(serviceId: string): void {
    const client = this.client;
    if (!client?.connected || this.serviceSubs.has(serviceId)) return;
    this.serviceSubs.set(
      serviceId,
      client.subscribe(`${SERVICE_TOPIC_PREFIX}${serviceId}`, (message) => this.handleMessage(message)),
    );
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Envía un mensaje al gateway. El Gateway aún no recibe mensajes del cliente. */
  emit(event: string, _data: unknown): void {
    if (USE_MOCKS) return;
    // eslint-disable-next-line no-console
    console.info('[realtime] el envío por WebSocket aún no está soportado, se descarta:', event);
  }

  private createClient(): Client {
    const client = new Client({
      brokerURL: brokerUrl(),
      connectHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      reconnectDelay: BASE_DELAY_MS,
      maxReconnectDelay: MAX_DELAY_MS,
    });

    client.onConnect = () => {
      this.setStatus('open');
      // stompjs no rehace las suscripciones al reconectar: van en cada onConnect.
      client.subscribe(MAP_TOPIC, (message) => this.handleMessage(message));
      client.subscribe(ERRORS_QUEUE, (message) => {
        console.warn('[realtime] error del Gateway:', message.body);
      });
      // Las suscripciones viejas murieron con la conexión: se rehacen las de las pantallas abiertas.
      this.serviceSubs.clear();
      for (const serviceId of this.watchedServices.keys()) this.subscribeService(serviceId);
    };

    client.onStompError = (frame) => {
      // Frame ERROR (ej. token rechazado): reintentar con el mismo token no sirve.
      console.warn('[realtime] el Gateway rechazó la conexión:', frame.headers.message ?? frame.body);
      this.intentionallyClosed = true;
      if (this.client === client) this.client = null;
      void client.deactivate();
      this.setStatus('closed');
    };

    client.onWebSocketClose = () => {
      // Un cliente viejo (ya reemplazado o desactivado) no toca el estado.
      if (this.client !== client) return;
      this.setStatus(this.intentionallyClosed ? 'closed' : 'reconnecting');
    };

    client.onWebSocketError = () => {
      // onWebSocketClose llega siempre después: la reconexión la gestiona stompjs.
      console.warn('[realtime] error de socket');
    };

    return client;
  }

  private handleMessage(message: IMessage): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.body);
    } catch {
      console.warn('[realtime] mensaje no-JSON descartado');
      return;
    }

    if (!isGatewayEnvelope(parsed)) {
      console.warn('[realtime] mensaje sin forma de evento del Gateway descartado');
      return;
    }

    const translated = translateGatewayEvent(parsed);
    if (translated) this.dispatch(translated.event, translated.data);
  }

  /**
   * Entrega un evento a los listeners como si viniera del broker.
   * Fuera de este archivo solo lo usan los mocks.
   */
  dispatch<E extends RealtimeEventName>(event: E, data: RealtimeEventPayloads[E]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        // Un listener roto no puede tumbar a los demás.
        console.error('[realtime] listener falló para:', event, error);
      }
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}

export const realtimeSocket = new RealtimeSocket();