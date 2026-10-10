import { useState } from 'react';
import { useToast } from '@/context';
import { RealtimeEvent, useRealtime, type ServiceAssignedPayload } from '@/lib/realtime';

/** Un cliente reservó al barbero: se avisa y se ofrece ir al servicio. */
export function useIncomingService() {
  const { show } = useToast();
  const [incoming, setIncoming] = useState<ServiceAssignedPayload | null>(null);

  useRealtime(RealtimeEvent.ServiceAssigned, (payload) => {
    setIncoming(payload);
    show({ tone: 'success', title: `${payload.customerName} te reservó`, body: 'Abre el servicio para ver la ruta.' });
  });

  return incoming;
}
