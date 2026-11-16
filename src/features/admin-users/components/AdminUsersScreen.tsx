import { useState } from 'react';
import { Button } from '@/components';
import { useSession, type UserRole } from '@/context';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type ManagedUser } from '../services';
import '../admin-users.css';

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

interface UserRowProps {
  user: ManagedUser;
  isSelf: boolean;
  saving: boolean;
  onChange: (user: ManagedUser, role: UserRole) => void;
}

function UserRow({ user, isSelf, saving, onChange }: UserRowProps) {
  const [draft, setDraft] = useState<UserRole>(user.role);
  const changed = draft !== user.role;

  return (
    <tr>
      <td>
        <span className="admin-users__name">{user.name}</span>
        {isSelf ? <span className="admin-users__self">tú</span> : null}
        <span className="admin-users__email">{user.email}</span>
      </td>
      <td>{DATE_FORMAT.format(new Date(user.createdAt))}</td>
      <td>
        <label className="admin-users__role">
          <span className="admin-users__sr">Rol de {user.name}</span>
          <select
            className="field__input"
            value={draft}
            disabled={isSelf || saving}
            onChange={(event) => setDraft(event.target.value as UserRole)}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <Button
          variant="secondary"
          disabled={!changed || isSelf}
          loading={saving}
          onClick={() => onChange(user, draft)}
        >
          Aplicar
        </Button>
      </td>
    </tr>
  );
}

/** HU-Q3: el administrador asigna el rol de cada cuenta. */
export function AdminUsersScreen() {
  const { session } = useSession();
  const currentUserId = session?.user.id ?? '';
  const { users, total, loading, error, savingId, query, setQuery, reload, changeRole } =
    useAdminUsers(currentUserId);

  return (
    <div className="admin-users">
      <header className="admin-users__head">
        <div>
          <h1 className="admin-users__title">Usuarios y roles</h1>
          <p className="admin-users__hint">
            Los clientes entran con Google. Aquí decides quién es barbero o administrador.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void reload()}>
          Actualizar
        </Button>
      </header>

      <label className="field admin-users__search">
        <span className="field__label">Buscar por nombre o correo</span>
        <input
          className="field__input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej. andres"
        />
      </label>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="admin-users__hint" role="status">
          Cargando usuarios…
        </p>
      ) : (
        <div className="admin-users__card">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Se unió</th>
                <th scope="col">Rol</th>
                <th scope="col">
                  <span className="admin-users__sr">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={`${user.id}:${user.role}`}
                  user={user}
                  isSelf={user.id === currentUserId}
                  saving={savingId === user.id}
                  onChange={(target, role) => void changeRole(target, role)}
                />
              ))}
            </tbody>
          </table>
          {users.length === 0 ? (
            <p className="admin-users__hint admin-users__empty">
              {total === 0 ? 'Todavía no hay usuarios.' : 'Nadie coincide con esa búsqueda.'}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
