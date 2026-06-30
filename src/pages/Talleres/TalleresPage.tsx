/// <summary>
/// Componente TalleresPage.tsx
/// </summary>
import './TalleresPage.css';
import { useState, useEffect } from 'react';
import { FiEdit2, FiEye, FiPlus, FiPower } from 'react-icons/fi';
import type { WorkshopRead, WorkshopInsurerSummary } from '../../types/taller';
import { getTalleresPage, activateTaller, deactivateTaller } from '../../services/talleres.service';
import { useAuth } from '../../context/AuthContext';
import { canDeleteWorkshops, canManageWorkshops } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import TallerFormModal from './components/TallerFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function TalleresPage() {
    const { currentUser } = useAuth();
    const [talleres, setTalleres] = useState<WorkshopRead[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTaller, setEditingTaller] = useState<WorkshopRead | null>(null);
    const [viewingTaller, setViewingTaller] = useState<WorkshopRead | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [tallerToToggle, setTallerToToggle] = useState<WorkshopRead | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [ordering, setOrdering] = useState('name');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const canMutate = canManageWorkshops(currentUser?.role);
    const canDelete = canDeleteWorkshops(currentUser?.role);

    const loadData = () => {
        setLoading(true);
        getTalleresPage({
            search,
            is_active: activeFilter,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then((data) => {
                setTalleres(data.results);
                setTotalCount(data.count);
            })
            .catch((err) => setErrorMsg(`Error al cargar datos: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [search, activeFilter, ordering, page]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setActiveFilter('true');
        setOrdering('name');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || activeFilter !== 'true' || ordering !== 'name';

    const openNew = () => {
        if (!canDelete) return;
        setEditingTaller(null);
        setViewingTaller(null);
        setModalOpen(true);
    };

    const openEdit = (t: WorkshopRead) => {
        if (!canMutate) return;
        setEditingTaller(t);
        setViewingTaller(null);
        setModalOpen(true);
    };

    const openView = (t: WorkshopRead) => {
        setEditingTaller(null);
        setViewingTaller(t);
        setModalOpen(true);
    };

    const handleToggleStatus = async () => {
        if (!canMutate) return;
        if (!tallerToToggle) return;
        const shouldActivate = !tallerToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            if (shouldActivate) {
                await activateTaller(tallerToToggle.id);
            } else {
                await deactivateTaller(tallerToToggle.id);
            }
            setTallerToToggle(null);
            loadData();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const renderTableBody = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={8} className="td-empty">
                        Cargando talleres...
                    </td>
                </tr>
            );
        }
        if (talleres.length === 0) {
            return (
                <tr>
                    <td colSpan={8} className="td-empty">
                        No hay talleres registrados.
                    </td>
                </tr>
            );
        }
        return talleres.map(t => (
            <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.ruc || '—'}</td>
                <td>{t.phone || '—'}</td>
                <td>{t.contact_executive || '—'}</td>
                <td>
                    {t.insurers_summary && t.insurers_summary.length > 0
                        ? t.insurers_summary.map((i: WorkshopInsurerSummary) => i.name).join(', ')
                        : '—'}
                </td>
                <td>
                    <span className={`estado-badge estado-badge--${t.is_active ? 'activo' : 'inactivo'}`}>
                        {t.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button
                            className="action-btn action-btn--view"
                            onClick={() => openView(t)}
                        >
                            <FiEye aria-hidden="true" />
                            <span>Ver</span>
                        </button>
                        {canMutate && (
                            <button
                                className="action-btn action-btn--edit"
                                onClick={() => openEdit(t)}
                            >
                                <FiEdit2 aria-hidden="true" />
                                <span>Editar</span>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                className={`action-btn ${t.is_active ? 'action-btn--delete' : 'action-btn--activate'}`}
                                onClick={() => setTallerToToggle(t)}
                            >
                                <FiPower aria-hidden="true" />
                                <span>{t.is_active ? 'Desactivar' : 'Activar'}</span>
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className="talleres-page">
            <div className="talleres-header">
                <h1 className="talleres-title">Gestión de talleres</h1>
                {canMutate && (
                    <button className="btn-new-taller" onClick={openNew}>
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
                searchPlaceholder="Buscar por nombre o RUC"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: 'name', label: 'Nombre' },
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'ruc', label: 'RUC' },
                    { value: 'is_active', label: 'Estado' },
                ]}
                filters={(
                    <div className="list-controls__field">
                        <label htmlFor="workshops-active">Estado</label>
                        <select id="workshops-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                            <option value="">Todos</option>
                            <option value="true">Activos</option>
                            <option value="false">Inactivos</option>
                        </select>
                    </div>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="talleres-table-wrap">
                <table className="talleres-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>RUC</th>
                            <th>Teléfono</th>
                            <th>Ejecutivo Contacto</th>
                            <th>Aseguradoras</th>
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

            <TallerFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={loadData}
                editingTaller={editingTaller}
                viewingTaller={viewingTaller}
                canMutate={canMutate}
            />

            <ConfirmDialog
                isOpen={!!tallerToToggle}
                title={`${tallerToToggle?.is_active ? 'Desactivar' : 'Activar'} taller`}
                message={`Esta acción ${tallerToToggle?.is_active ? 'desactivará' : 'activará'} el taller ${tallerToToggle?.name ?? ''}. ¿Desea continuar?`}
                confirmLabel={tallerToToggle?.is_active ? 'Desactivar' : 'Activar'}
                variant={tallerToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setTallerToToggle(null)}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}