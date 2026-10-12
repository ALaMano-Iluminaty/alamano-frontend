import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cliente STOMP falso: guarda las suscripciones y deja simular conexión y corte.
const stomp = vi.hoisted(() => {
  type Callback = (message: { body: string }) => void;

  class FakeClient {
    static instances: FakeClient[] = [];
    connected = false;
    active = false;
    subscriptions: { destination: string; callback: Callback; unsubscribe: () => void; active: boolean }[] = [];
    onConnect: () => void = () => {};
    onWebSocketClose: () => void = () => {};
    onStompError: () => void = () => {};
    onWebSocketError: () => void = () => {};

    constructor(public readonly config: Record<string, unknown>) {
      FakeClient.instances.push(this);
    }

    activate() {
      this.active = true;
    }

    deactivate() {
      this.active = false;
      this.connected = false;
      return Promise.resolve();
    }

    subscribe(destination: string, callback: Callback) {
      const entry = {
        destination,
        callback,
        active: true,
        unsubscribe: () => {
          entry.active = false;
        },
      };
      this.subscriptions.push(entry);
      return { id: destination, unsubscribe: entry.unsubscribe };
    }

    /** El broker acepta el CONNECT. */
    open() {
      this.connected = true;
      this.onConnect();
    }

    /** Se cae el WebSocket; stompjs reintentará solo. */
    drop() {
      this.connected = false;
      for (const entry of this.subscriptions) entry.active = false;
      this.onWebSocketClose();
    }

    activeDestinations(): string[] {
      return this.subscriptions.filter((entry) => entry.active).map((entry) => entry.destination);
    }

    deliver(destination: string, body: unknown) {
      for (const entry of this.subscriptions) {
        if (entry.active && entry.destination === destination) entry.callback({ body: JSON.stringify(body) });
      }
    }
  }

  return { FakeClient };
});

vi.mock('@stomp/stompjs', () => ({
  Client: stomp.FakeClient,
  ReconnectionTimeMode: { LINEAR: 0, EXPONENTIAL: 1 },
}));
vi.mock('@/lib/mock', () => ({ USE_MOCKS: false }));

import { RealtimeSocket, SELLER_SERVICES_QUEUE } from './socket';
import { RealtimeEvent } from './events';

type FakeClient = InstanceType<typeof stomp.FakeClient>;

function lastClient(): FakeClient {
  const client = stomp.FakeClient.instances.at(-1);
  if (!client) throw new Error('no se creó ningún cliente STOMP');
  return client;
}

function statusChanged(eventId: string, version: number, status = 'RESERVED') {
  return {
    eventId,
    type: 'service.status.changed',
    schemaVersion: 1,
    occurredAt: '2026-10-11T10:00:00Z',
    correlationId: 'corr-1',
    payload: { serviceId: 'svc-1', professionalId: 'pro-1', clientId: 'cli-1', previousStatus: null, status, version },
  };
}

describe('RealtimeSocket', () => {
  beforeEach(() => {
    stomp.FakeClient.instances = [];
    vi.stubGlobal('window', { location: { protocol: 'http:', host: 'localhost:5173' } });
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('envía el token en el CONNECT, no en la URL', () => {
    const socket = new RealtimeSocket();
    socket.connect('jwt-123');
    const { config } = lastClient();
    expect(config.connectHeaders).toEqual({ Authorization: 'Bearer jwt-123' });
    expect(config.brokerURL).toBe('ws://localhost:5173/ws');
  });

  it('rehace todas las suscripciones activas tras reconectar', () => {
    const socket = new RealtimeSocket();
    socket.subscribe(SELLER_SERVICES_QUEUE);
    socket.watchService('svc-1');
    const stopWatching = socket.watchService('svc-2');
    socket.connect('jwt');
    const client = lastClient();

    client.open();
    expect(client.activeDestinations()).toEqual(
      expect.arrayContaining(['/topic/map', SELLER_SERVICES_QUEUE, '/topic/service.svc-1', '/topic/service.svc-2']),
    );

    stopWatching();
    client.drop();
    expect(socket.getStatus()).toBe('reconnecting');

    client.open();
    const destinations = client.activeDestinations();
    expect(destinations).toEqual(
      expect.arrayContaining(['/topic/map', SELLER_SERVICES_QUEUE, '/topic/service.svc-1']),
    );
    expect(destinations).not.toContain('/topic/service.svc-2');
    // Una sola suscripción viva por destino: sin duplicados tras reconectar.
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it('suscribe a un destino pedido mientras estaba desconectado al volver la conexión', () => {
    const socket = new RealtimeSocket();
    socket.connect('jwt');
    const client = lastClient();
    socket.watchService('svc-9');
    expect(client.activeDestinations()).not.toContain('/topic/service.svc-9');
    client.open();
    expect(client.activeDestinations()).toContain('/topic/service.svc-9');
  });

  it('entrega una sola vez un evento que llega por dos destinos', () => {
    const socket = new RealtimeSocket();
    const listener = vi.fn();
    socket.on(RealtimeEvent.ServiceStatusChanged, listener);
    socket.subscribe(SELLER_SERVICES_QUEUE);
    socket.watchService('svc-1');
    socket.connect('jwt');
    const client = lastClient();
    client.open();

    const event = statusChanged('e-1', 0);
    client.deliver('/topic/service.svc-1', event);
    client.deliver(SELLER_SERVICES_QUEUE, event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 'svc-1', status: 'ACCEPTED', previousStatus: null, version: 0 }),
    );
  });

  it('descarta un evento desordenado con versión vieja', () => {
    const socket = new RealtimeSocket();
    const listener = vi.fn();
    socket.on(RealtimeEvent.ServiceStatusChanged, listener);
    socket.watchService('svc-1');
    socket.connect('jwt');
    const client = lastClient();
    client.open();

    client.deliver('/topic/service.svc-1', statusChanged('e-2', 1, 'EN_ROUTE'));
    client.deliver('/topic/service.svc-1', statusChanged('e-1', 0, 'RESERVED'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'ON_THE_WAY', version: 1 }));
  });

  it('usa el handler propio de subscribe en vez de traducir', () => {
    const socket = new RealtimeSocket();
    const handler = vi.fn();
    socket.subscribe('/topic/otro', handler);
    socket.connect('jwt');
    const client = lastClient();
    client.open();

    const event = statusChanged('e-1', 0);
    client.deliver('/topic/otro', event);
    expect(handler).toHaveBeenCalledWith(event);
  });
});
