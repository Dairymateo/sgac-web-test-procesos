/// <summary>
/// Componente ClientesPage.tsx
/// </summary>
import './ClientesPage.css';
import { useState, useEffect } from 'react';
import { FiEdit2, FiEye, FiPlus, FiPower } from 'react-icons/fi';
import type { Cliente } from '../../types/cliente';
import { activateCliente, deactivateCliente, getClientesPage } from '../../services/clientes.service';
import { useAuth } from '../../context/AuthContext';
import { canDeactivateClients, canManageClients } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import ClienteFormModal from './components/ClienteFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function ClientesPage() {
    const { currentUser } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [clienteToToggle, setClienteToToggle] = useState<Cliente | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [statusErrorMsg, setStatusErrorMsg] = useState<string | null>(null);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [personType, setPersonType] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [ordering, setOrdering] = useState('-created_at');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const canMutate = canManageClients(currentUser?.role);
    const canDeactivate = canDeactivateClients(currentUser?.role);

    const loadClientes = () => {
        setLoading(true);
        getClientesPage({
            search,
            person_type: personType,
            document_type: documentType,
            is_active: activeFilter,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then((data) => {
                setClientes(data.results);
                setTotalCount(data.count);
            })
            .catch((err) => setErrorMsg(`Error al cargar clientes: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadClientes();
    }, [search, personType, documentType, activeFilter, ordering, page]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setPersonType('');
        setDocumentType('');
        setActiveFilter('true');
        setOrdering('-created_at');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || personType !== '' || documentType !== '' || activeFilter !== 'true' || ordering !== '-created_at';

    const openNew = () => {
        if (!canDeactivate) return;
        setEditingCliente(null);
        setViewingCliente(null);
        setModalOpen(true);
    };

    const openEdit = (c: Cliente) => {
        if (!canMutate) return;
        setEditingCliente(c);
        setViewingCliente(null);
        setModalOpen(true);
    };

    const openView = (c: Cliente) => {
        setEditingCliente(null);
        setViewingCliente(c);
        setModalOpen(true);
    };

    const handleToggleStatus = async () => {
        if (!canMutate) return;
        if (!clienteToToggle) return;
        const shouldActivate = clienteToToggle.is_active === false;
        setIsTogglingStatus(true);
        setStatusErrorMsg(null);
        try {
            if (shouldActivate) {
                await activateCliente(clienteToToggle.id);
            } else {
                await deactivateCliente(clienteToToggle.id);
            }
            setClienteToToggle(null);
            loadClientes();
        } catch (err: any) {
            if (err?.isGlobal) return;
            if (err?.status === 409 || err?.code === 'conflict') {
                setErrorMsg(shouldActivate
                    ? 'No se puede activar este cliente en este momento.'
                    : 'No se puede desactivar este cliente porque tiene vehiculos, cotizaciones o siniestros relacionados.');
                return;
            }
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const renderTableContent = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={6} className="td-empty">
                        Cargando clientes...
                    </td>
                </tr>
            );
        }

        if (clientes.length === 0) {
            return (
                <tr>
                    <td colSpan={6} className="td-empty">
                        No hay clientes registrados.
                    </td>
                </tr>
            );
        }

        return clientes.map(c => (
            <tr key={c.id}>
                <td>{c.customer_code || '—'}</td>
                <td className="td-nombre">{c.first_names} {c.last_names}</td>
                <td>{c.document_number}</td>
                <td>{c.phone_1}</td>
                <td>
                    <span className={`cliente-status cliente-status--${c.is_active === false ? 'inactive' : 'active'}`}>
                        {c.is_active === false ? 'Inactivo' : 'Activo'}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button
                            className="action-btn action-btn--view"
                            onClick={() => openView(c)}
                        >
                            <FiEye aria-hidden="true" />
                            <span>Ver</span>
                        </button>
                        {canMutate && (
                            <>
                                <button
                                    className="action-btn action-btn--edit"
                                    onClick={() => openEdit(c)}
                                >
                                    <FiEdit2 aria-hidden="true" />
                                    <span>Editar</span>
                                </button>
                                {canDeactivate && (
                                    <button
                                        className={`action-btn ${c.is_active === false ? 'action-btn--activate' : 'action-btn--delete'}`}
                                        onClick={() => setClienteToToggle(c)}
                                    >
                                        <FiPower aria-hidden="true" />
                                        <span>{c.is_active === false ? 'Activar' : 'Desactivar'}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className="clientes-page">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de clientes</h1>
                {canMutate && (
                    <button className="btn-new-cliente" onClick={openNew}>
                        <FiPlus aria-hidden="true" />
                        <span>Nuevo</span>
                    </button>
                )}
            </div>

            {errorMsg && (
                <div className="action-error" role="alert">
                    {errorMsg}
                    <button
                        onClick={() => setErrorMsg(null)}
                        className="btn-close-error"
                        aria-label="Cerrar"
                    >✕</button>
                </div>
            )}

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por nombre, apellido o documento"
                ordering={ordering}
                onOrderingChange={(value) => {
                    setOrdering(value);
                    setPage(1);
                }}
                orderingOptions={[
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'customer_code', label: 'Código' },
                    { value: 'document_number', label: 'Documento' },
                    { value: 'first_names', label: 'Nombres' },
                    { value: 'last_names', label: 'Apellidos' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="clientes-person-type">Tipo</label>
                            <select id="clientes-person-type" value={personType} onChange={(event) => { setPersonType(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="individual">Natural</option>
                                <option value="legal_entity">Jurídica</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="clientes-document-type">Documento</label>
                            <select id="clientes-document-type" value={documentType} onChange={(event) => { setDocumentType(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="CC">Cédula</option>
                                <option value="RUC">RUC</option>
                                <option value="PAS">Pasaporte</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="clientes-active">Estado</label>
                            <select id="clientes-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="true">Activos</option>
                                <option value="false">Inactivos</option>
                            </select>
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="clientes-table-wrap">
                <table className="clientes-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Identificación</th>
                            <th>Teléfono</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderTableContent()}
                    </tbody>
                </table>
            </div>

            <ListPagination page={page} count={totalCount} onPageChange={setPage} />

            <ClienteFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={loadClientes}
                editingCliente={editingCliente}
                viewingCliente={viewingCliente}
                canMutate={canMutate}
            />

            <ConfirmDialog
                isOpen={!!clienteToToggle}
                title={`${clienteToToggle?.is_active === false ? 'Activar' : 'Desactivar'} cliente`}
                message={`Esta acción ${clienteToToggle?.is_active === false ? 'activará' : 'desactivará'} a ${clienteToToggle?.first_names ?? ''} ${clienteToToggle?.last_names ?? ''}. ¿Desea continuar?`}
                confirmLabel={clienteToToggle?.is_active === false ? 'Activar' : 'Desactivar'}
                variant={clienteToToggle?.is_active === false ? 'warning' : 'danger'}
                isLoading={isTogglingStatus}
                error={statusErrorMsg}
                onCancel={() => {
                    setClienteToToggle(null);
                    setStatusErrorMsg(null);
                }}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}