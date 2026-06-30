/// <summary>
/// Componente AseguradorasPage.tsx
/// </summary>
import './AseguradorasPage.css';
import { useState, useEffect } from 'react';
import { FiEdit2, FiEye, FiPlus, FiPower } from 'react-icons/fi';
import type { Aseguradora } from '../../types/aseguradora';
import { getAseguradorasPage, activateAseguradora, deactivateAseguradora } from '../../services/aseguradoras.service';
import { useAuth } from '../../context/AuthContext';
import { canDeleteInsurers, canManageInsurers } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import AseguradoraFormModal from './components/AseguradoraFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function AseguradorasPage() {
    const { currentUser } = useAuth();
    const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Aseguradora | null>(null);
    const [viewingItem, setViewingItem] = useState<Aseguradora | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [itemToToggle, setItemToToggle] = useState<Aseguradora | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [city, setCity] = useState('');
    const [ordering, setOrdering] = useState('name');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const canMutate = canManageInsurers(currentUser?.role);
    const canDelete = canDeleteInsurers(currentUser?.role);

    const loadData = () => {
        setLoading(true);
        getAseguradorasPage({
            search,
            is_active: activeFilter,
            city,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then((data) => {
                setAseguradoras(data.results);
                setTotalCount(data.count);
            })
            .catch((err) => setErrorMsg(`Error al cargar datos: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [search, activeFilter, city, ordering, page]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setActiveFilter('true');
        setCity('');
        setOrdering('name');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || activeFilter !== 'true' || city !== '' || ordering !== 'name';

    const openNew = () => {
        if (!canDelete) return;
        setEditingItem(null);
        setViewingItem(null);
        setModalOpen(true);
    };

    const openEdit = (a: Aseguradora) => {
        if (!canMutate) return;
        setEditingItem(a);
        setViewingItem(null);
        setModalOpen(true);
    };

    const openView = (a: Aseguradora) => {
        setEditingItem(null);
        setViewingItem(a);
        setModalOpen(true);
    };

    const handleToggleStatus = async () => {
        if (!canMutate) return;
        if (!itemToToggle) return;
        const shouldActivate = !itemToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            if (shouldActivate) {
                await activateAseguradora(itemToToggle.id);
            } else {
                await deactivateAseguradora(itemToToggle.id);
            }
            setItemToToggle(null);
            loadData();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    return (
        <div className="aseguradoras-page">
            <div className="aseguradoras-header">
                <h1 className="aseguradoras-title">Gestión de aseguradoras</h1>
                {canMutate && (
                    <button className="btn-new-aseguradora" onClick={openNew}>
                        <FiPlus aria-hidden="true" />
                        <span>Nueva</span>
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
                searchPlaceholder="Buscar por nombre, código o documento"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: 'name', label: 'Nombre' },
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'document_number', label: 'Documento' },
                    { value: 'insurer_code', label: 'Código' },
                    { value: 'active', label: 'Estado' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="insurers-active">Estado</label>
                            <select id="insurers-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="true">Activas</option>
                                <option value="false">Inactivas</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="insurers-city">Ciudad</label>
                            <input type="text" id="insurers-city" value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} />
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="aseguradoras-table-wrap">
                <table className="aseguradoras-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Documento</th>
                            <th>Ciudad</th>
                            <th>Teléfono</th>
                            <th>Talleres</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} className="td-empty">
                                    Cargando aseguradoras...
                                </td>
                            </tr>
                        )}
                        {!loading && aseguradoras.length === 0 && (
                            <tr>
                                <td colSpan={8} className="td-empty">
                                    No hay aseguradoras registradas.
                                </td>
                            </tr>
                        )}
                        {!loading && aseguradoras.map(a => (
                            <tr key={a.id}>
                                <td>{a.insurer_code}</td>
                                <td>{a.name}</td>
                                <td>{a.document_number}</td>
                                <td>{a.city || '—'}</td>
                                <td>{a.phone || '—'}</td>
                                <td>
                                    {a.workshops_summary && a.workshops_summary.length > 0
                                        ? a.workshops_summary.map(w => w.name).join(', ')
                                        : '—'}
                                </td>
                                <td>
                                    <span className={`estado-badge estado-badge--${a.is_active ? 'activo' : 'inactivo'}`}>
                                        {a.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button
                                            className="action-btn action-btn--view"
                                            onClick={() => openView(a)}
                                        >
                                            <FiEye aria-hidden="true" />
                                            <span>Ver</span>
                                        </button>
                                        {canMutate && (
                                            <button
                                                className="action-btn action-btn--edit"
                                                onClick={() => openEdit(a)}
                                            >
                                                <FiEdit2 aria-hidden="true" />
                                                <span>Editar</span>
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                className={`action-btn ${a.is_active ? 'action-btn--delete' : 'action-btn--activate'}`}
                                                onClick={() => setItemToToggle(a)}
                                            >
                                                <FiPower aria-hidden="true" />
                                                <span>{a.is_active ? 'Desactivar' : 'Activar'}</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ListPagination page={page} count={totalCount} onPageChange={setPage} />

            <AseguradoraFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={loadData}
                editingItem={editingItem}
                viewingItem={viewingItem}
                canMutate={canMutate}
            />

            <ConfirmDialog
                isOpen={!!itemToToggle}
                title={`${itemToToggle?.is_active ? 'Desactivar' : 'Activar'} aseguradora`}
                message={`Esta acción ${itemToToggle?.is_active ? 'desactivará' : 'activará'} la aseguradora ${itemToToggle?.name ?? ''}. ¿Desea continuar?`}
                confirmLabel={itemToToggle?.is_active ? 'Desactivar' : 'Activar'}
                variant={itemToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setItemToToggle(null)}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}