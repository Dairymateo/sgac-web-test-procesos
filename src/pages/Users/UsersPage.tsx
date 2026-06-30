/// <summary>
/// Componente UsersPage.tsx
/// </summary>
import './UsersPage.css';
import { useState, useEffect } from 'react';
import { FiEdit2, FiPlus, FiPower } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import type { User } from '../../types/user';
import UserFormModal from './components/UserFormModal';
import type { FormUsuario } from './components/UserFormModal';
import {
    getUsersPage,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
} from '../../services/users.service';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers, getRoleLabel } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';

interface UsersPageProps {
    readonly embedded?: boolean;
}

export default function UsersPage({ embedded = false }: UsersPageProps) {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [userToToggle, setUserToToggle] = useState<User | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [ordering, setOrdering] = useState('username');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (!canManageUsers(currentUser)) return;

        setLoadingUsers(true);
        getUsersPage({
            search,
            role: roleFilter,
            is_active: activeFilter,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then((data) => {
                setUsers(data.results);
                setTotalCount(data.count);
            })
            .catch((err) => setErrorMsg(`No se pudo cargar la lista: ${err.message}`))
            .finally(() => setLoadingUsers(false));
    }, [currentUser, search, roleFilter, activeFilter, ordering, page]);

    if (currentUser && !canManageUsers(currentUser)) {
        return <Navigate to="/dashboard" replace />;
    }

    const openNew = () => {
        setEditingUser(null);
        setModalOpen(true);
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setModalOpen(true);
    };

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setRoleFilter('');
        setActiveFilter('true');
        setOrdering('username');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || roleFilter !== '' || activeFilter !== 'true' || ordering !== 'username';

    const handleSave = async (data: FormUsuario) => {
        setErrorMsg(null);
        if (data.id) {
            const updated = await updateUser(data.id, {
                username: data.username,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                role: data.role,
                is_active: data.is_active,
            });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } else {
            if (!data.password) {
                throw new Error('La contraseña es obligatoria para nuevos usuarios');
            }
            const created = await createUser({
                ...(data.username.trim() ? { username: data.username.trim() } : {}),
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                password: data.password,
                role: data.role,
                is_active: data.is_active,
            });
            setUsers((prev) => [...prev, created]);
        }

        setModalOpen(false);
    };

    const handleToggleStatus = async () => {
        if (!userToToggle) return;
        const shouldActivate = !userToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            const updated = shouldActivate ? await activateUser(userToToggle.id) : await deactivateUser(userToToggle.id);
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setUserToToggle(null);
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const renderTableBody = () => {
        if (loadingUsers) {
            return (
                <tr>
                    <td colSpan={6} className="td-empty">
                        Cargando usuarios...
                    </td>
                </tr>
            );
        }

        if (users.length === 0) {
            return (
                <tr>
                    <td colSpan={6} className="td-empty">
                        No hay usuarios registrados.
                    </td>
                </tr>
            );
        }

        return users.map((user) => (
            <tr key={user.id}>
                <td className="td-nombre">{user.username}</td>
                <td>{(user.first_name || user.last_name) ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '-'}</td>
                <td className="td-email">{user.email}</td>
                <td className="td-rol">
                    <span className="rol-link">{getRoleLabel(user.role)}</span>
                </td>
                <td>
                    <span
                        className={`badge-estado ${user.is_active
                            ? 'badge-activo'
                            : 'badge-inactivo'
                            }`}
                    >
                        {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button
                            className="action-btn action-btn--edit"
                            onClick={() => openEdit(user)}
                        >
                            <FiEdit2 aria-hidden="true" />
                            <span>Editar</span>
                        </button>
                        <button
                            className={`action-btn ${user.is_active ? 'action-btn--toggle-inactive' : 'action-btn--toggle-active'}`}
                            onClick={() => setUserToToggle(user)}
                        >
                            <FiPower aria-hidden="true" />
                            <span>{user.is_active ? 'Desactivar' : 'Activar'}</span>
                        </button>
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className={`users-page${embedded ? ' users-page--embedded' : ''}`}>
            <div className="users-header">
                {!embedded && <h1 className="users-title">Gestión de usuarios</h1>}
                <button className="btn-new-user" onClick={openNew}>
                    <FiPlus aria-hidden="true" />
                    <span>Nuevo</span>
                </button>
            </div>

            {errorMsg && (
                <div className="login-error" role="alert" style={{ marginBottom: '12px' }}>
                    {errorMsg}
                    <button
                        onClick={() => setErrorMsg(null)}
                        style={{ marginLeft: 12, cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}
                        aria-label="Cerrar"
                    >x</button>
                </div>
            )}

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por usuario, nombre o email"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: 'username', label: 'Usuario' },
                    { value: 'email', label: 'Email' },
                    { value: 'role', label: 'Rol' },
                    { value: 'is_active', label: 'Estado' },
                    { value: '-date_joined', label: 'Más recientes' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="users-role">Rol</label>
                            <select id="users-role" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="admin">Administrador</option>
                                <option value="quote_technician">Técnico de Cotizaciones</option>
                                <option value="sales_representative">Vendedor Comercial</option>
                                <option value="administrative_staff">Personal Administrativo</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="users-active">Estado</label>
                            <select id="users-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="true">Activos</option>
                                <option value="false">Inactivos</option>
                            </select>
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="users-table-wrap">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Nombre de usuario</th>
                            <th>Nombre Completo</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>

            <ListPagination page={page} count={totalCount} onPageChange={setPage} />

            <UserFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                editingUser={editingUser}
            />

            <ConfirmDialog
                isOpen={!!userToToggle}
                title={`${userToToggle?.is_active ? 'Desactivar' : 'Activar'} usuario`}
                message={`Esta acción ${userToToggle?.is_active ? 'desactivará' : 'activará'} al usuario ${userToToggle?.username ?? ''}. ¿Desea continuar?`}
                confirmLabel={userToToggle?.is_active ? 'Desactivar' : 'Activar'}
                variant={userToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setUserToToggle(null)}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}