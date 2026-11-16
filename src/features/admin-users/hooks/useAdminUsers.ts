import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast, type UserRole } from '@/context';
import { ROLE_LABELS, adminErrorMessage, changeUserRole, fetchUsers, type ManagedUser } from '../services';

/** Quita tildes y mayúsculas para que «andres» encuentre «Andrés». */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Filtra por nombre o correo. Sin texto, devuelve todo. */
export function filterUsers(users: ManagedUser[], query: string): ManagedUser[] {
  const needle = normalizeSearch(query);
  if (!needle) return users;
  return users.filter((user) => normalizeSearch(`${user.name} ${user.email}`).includes(needle));
}

/**
 * HU-Q3: lista de cuentas y cambio de rol. Quien administra no puede
 * cambiarse el rol a sí mismo: así no se queda sin acceso por un descuido.
 */
export function useAdminUsers(currentUserId: string) {
  const toast = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
      setError(null);
    } catch (caught) {
      setError(adminErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = useCallback(
    async (user: ManagedUser, role: UserRole) => {
      if (user.id === currentUserId || user.role === role) return;
      setSavingId(user.id);
      try {
        const updated = await changeUserRole(user.id, role);
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.show({
          tone: 'success',
          title: 'Rol actualizado',
          body: `${user.name} ahora es ${ROLE_LABELS[updated.role]}.`,
        });
      } catch (caught) {
        toast.show({ tone: 'conflict', title: 'No se cambió el rol', body: adminErrorMessage(caught) });
      } finally {
        setSavingId(null);
      }
    },
    [currentUserId, toast],
  );

  const visibleUsers = useMemo(() => filterUsers(users, query), [users, query]);

  return { users: visibleUsers, total: users.length, loading, error, savingId, query, setQuery, reload: load, changeRole };
}
