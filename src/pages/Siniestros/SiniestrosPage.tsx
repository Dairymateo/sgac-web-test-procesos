/// <summary>
/// Componente SiniestrosPage.tsx
/// </summary>
import './SiniestrosPage.css';
import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiEye, FiPlus, FiPower, FiSend } from 'react-icons/fi';
import type { Claim } from '../../types/siniestro';
import { getSiniestrosPage, activateSiniestro, deactivateSiniestro, reportSiniestroToInsurer } from '../../services/siniestros.service';
import { getClientes } from '../../services/clientes.service';
import { getVehiculos } from '../../services/vehiculos.service';
import type { Cliente } from '../../types/cliente';
import type { Vehiculo } from '../../types/vehiculo';
import { useAuth } from '../../context/AuthContext';
import { canAccessClaims, canDeleteClaims, canManageClaims } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import SiniestroFormModal from './components/SiniestroFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = {
    reported: 'Reportado',
    in_progress: 'En progreso',
    authorized: 'Autorizado',
    under_repair: 'En reparacion',
    closed: 'Cerrado',
};

const DEFAULT_DATE_FROM = `${new Date().getFullYear()}-01-01`;
const DEFAULT_DATE_TO = new Date().toISOString().split('T')[0];

export default function SiniestrosPage() {
    const { currentUser } = useAuth();
    const canAccess = canAccessClaims(currentUser?.role);
    const canMutate = canManageClaims(currentUser?.role);
    const canDelete = canDeleteClaims(currentUser?.role);

    const [siniestros, setSiniestros] = useState<Claim[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSiniestro, setEditingSiniestro] = useState<Claim | null>(null);
    const [viewingSiniestro, setViewingSiniestro] = useState<Claim | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [claimToToggle, setClaimToToggle] = useState<Claim | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [reportingClaimId, setReportingClaimId] = useState<number | null>(null);
    const [pendingReportClaim, setPendingReportClaim] = useState<Claim | null>(null);
    const [isReportingFromCreate, setIsReportingFromCreate] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [claimDateFrom, setClaimDateFrom] = useState(DEFAULT_DATE_FROM);
    const [claimDateTo, setClaimDateTo] = useState(DEFAULT_DATE_TO);
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [ordering, setOrdering] = useState('-claim_date');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadSiniestros = () => {
        if (!canAccess) {
            setSiniestros([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        getSiniestrosPage({
            search,
            status: statusFilter,
            claim_date_from: claimDateFrom,
            claim_date_to: claimDateTo,
            min_amount: minAmount,
            max_amount: maxAmount,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then(data => {
                setSiniestros(data.results);
                setTotalCount(data.count);
            })
            .catch(err => setErrorMsg(`Error al cargar siniestros: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadSiniestros();
    }, [canAccess, search, statusFilter, claimDateFrom, claimDateTo, minAmount, maxAmount, ordering, page]);

    useEffect(() => {
        if (!canAccess) {
            setClientes([]);
            setVehiculos([]);
            return;
        }
        getClientes({ page_size: 100 }).then(setClientes).catch(() => setClientes([]));
        getVehiculos({ page_size: 100 }).then(setVehiculos).catch(() => setVehiculos([]));
    }, [canAccess]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setStatusFilter('');
        setClaimDateFrom(DEFAULT_DATE_FROM);
        setClaimDateTo(DEFAULT_DATE_TO);
        setMinAmount('');
        setMaxAmount('');
        setOrdering('-claim_date');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || statusFilter !== '' || claimDateFrom !== DEFAULT_DATE_FROM || claimDateTo !== DEFAULT_DATE_TO || minAmount !== '' || maxAmount !== '' || ordering !== '-claim_date';

    const clientesById = useMemo(() => {
        const map = new Map<number, Cliente>();
        for (const cliente of clientes) {
            map.set(cliente.id, cliente);
        }
        return map;
    }, [clientes]);

    const vehiculosById = useMemo(() => {
        const map = new Map<number, Vehiculo>();
        for (const vehiculo of vehiculos) {
            map.set(vehiculo.id, vehiculo);
        }
        return map;
    }, [vehiculos]);

    const getClienteDisplay = (clienteId: number) => {
        const cliente = clientesById.get(clienteId);
        if (!cliente) return 'Cliente no disponible';
        return `${cliente.customer_code || '--------'} - ${cliente.first_names} ${cliente.last_names}`;
    };

    const getVehiculoDisplay = (vehiculoId: number) => {
        const vehiculo = vehiculosById.get(vehiculoId);
        if (!vehiculo) return 'Vehículo no disponible';
        return `${vehiculo.license_plate} - ${vehiculo.brand} ${vehiculo.model} (${vehiculo.year})`;
    };

    const openNew = () => {
        if (!canMutate) return;
        setEditingSiniestro(null);
        setViewingSiniestro(null);
        setModalOpen(true);
    };

    const openEdit = (claim: Claim) => {
        if (!canMutate) return;
        setEditingSiniestro(claim);
        setViewingSiniestro(null);
        setModalOpen(true);
    };

    const openView = (claim: Claim) => {
        setEditingSiniestro(null);
        setViewingSiniestro(claim);
        setModalOpen(true);
    };

    const handleToggleStatus = async () => {
        if (!canMutate) return;
        if (!claimToToggle) return;
        const shouldActivate = !claimToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            if (shouldActivate) {
                await activateSiniestro(claimToToggle.id);
            } else {
                await deactivateSiniestro(claimToToggle.id);
            }
            setClaimToToggle(null);
            loadSiniestros();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'reactivar' : 'anular'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const handleReportToInsurer = async (claim: Claim) => {
        if (!canMutate || claim.insurer_report_date) return;
        setReportingClaimId(claim.id);
        try {
            await reportSiniestroToInsurer(claim.id);
            setSuccessMsg('Siniestro reportado a la aseguradora.');
            loadSiniestros();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al reportar a aseguradora: ${err.message}`);
        } finally {
            setReportingClaimId(null);
        }
    };

    const handleSaveSuccess = (newClaim?: Claim) => {
        loadSiniestros();
        if (newClaim && !newClaim.insurer_report_date) {
            setPendingReportClaim(newClaim);
        }
    };

    const handleConfirmReport = async () => {
        if (!pendingReportClaim) return;
        setIsReportingFromCreate(true);
        try {
            await reportSiniestroToInsurer(pendingReportClaim.id);
            setPendingReportClaim(null);
            setSuccessMsg('Siniestro reportado a la aseguradora.');
            loadSiniestros();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al reportar a aseguradora: ${err.message}`);
            setPendingReportClaim(null);
        } finally {
            setIsReportingFromCreate(false);
        }
    };

    const formatCurrency = (value?: string | null) => {
        if (!value) return '-';
        const parsed = Number.parseFloat(value);
        return Number.isNaN(parsed) ? value : `$${parsed.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;
    };

    if (!canAccess) {
        return (
            <div className="siniestros-page">
                <div className="siniestros-header">
                    <h1 className="siniestros-title">Gestión de siniestros</h1>
                </div>
                <div className="action-error" role="alert">
                    No tienes permisos para acceder a siniestros.
                </div>
            </div>
        );
    }

    const renderTableBody = () => {
        if (loading) {
            return <tr><td colSpan={7} className="td-empty">Cargando siniestros...</td></tr>;
        }
        if (siniestros.length === 0) {
            return <tr><td colSpan={7} className="td-empty">No hay siniestros registrados.</td></tr>;
        }
        return siniestros.map(claim => (
            <tr key={claim.id}>
                <td>{claim.claim_number || '-'}</td>
                <td>{getClienteDisplay(claim.insured_customer)}</td>
                <td>{getVehiculoDisplay(claim.vehicle)}</td>
                <td>{claim.claim_date}</td>
                <td>{formatCurrency(claim.claim_amount)}</td>
                <td>
                    <span className={`estado-badge estado-badge--${claim.status}`}>
                        {STATUS_LABELS[claim.status] || claim.status}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button className="action-btn action-btn--view" onClick={() => openView(claim)}>
                            <FiEye aria-hidden="true" />
                            <span>Ver</span>
                        </button>
                        {canMutate && (
                            <>
                                <button className="action-btn action-btn--edit" onClick={() => openEdit(claim)}>
                                    <FiEdit2 aria-hidden="true" />
                                    <span>Actualizar</span>
                                </button>
                                {!claim.insurer_report_date && (
                                    <button
                                        className="action-btn action-btn--view"
                                        onClick={() => handleReportToInsurer(claim)}
                                        disabled={reportingClaimId === claim.id}
                                    >
                                        <FiSend aria-hidden="true" />
                                        <span>{reportingClaimId === claim.id ? 'Reportando...' : 'Reportar a aseguradora'}</span>
                                    </button>
                                )}
                            </>
                        )}
                        {canDelete && (
                            <button
                                className={`action-btn ${claim.is_active ? 'action-btn--delete' : 'action-btn--activate'}`}
                                onClick={() => setClaimToToggle(claim)}
                            >
                                <FiPower aria-hidden="true" />
                                <span>{claim.is_active ? 'Anular' : 'Reactivar'}</span>
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className="siniestros-page">
            <div className="siniestros-header">
                <h1 className="siniestros-title">Gestión de siniestros</h1>
                {canMutate && (
                    <button className="btn-new-siniestro" onClick={openNew}>
                        <FiPlus aria-hidden="true" />
                        <span>Nuevo</span>
                    </button>
                )}
            </div>

            {errorMsg && (
                <div className="action-error" role="alert">
                    {errorMsg}
                    <button onClick={() => setErrorMsg(null)} className="btn-close-error" aria-label="Cerrar">x</button>
                </div>
            )}
            {successMsg && (
                <output className="action-success">
                    {successMsg}
                    <button onClick={() => setSuccessMsg(null)} className="btn-close-success" aria-label="Cerrar">x</button>
                </output>
            )}

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por número, cliente o descripción"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: '-claim_date', label: 'Fecha más reciente' },
                    { value: 'claim_number', label: 'Número' },
                    { value: 'status', label: 'Estado' },
                    { value: 'claim_amount', label: 'Monto' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="claims-status">Estado</label>
                            <select id="claims-status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="reported">Reportado</option>
                                <option value="in_progress">En progreso</option>
                                <option value="authorized">Autorizado</option>
                                <option value="under_repair">En reparación</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="claims-date-from">Desde</label>
                            <input id="claims-date-from" type="date" value={claimDateFrom} onChange={(event) => { setClaimDateFrom(event.target.value); setPage(1); }} />
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="claims-date-to">Hasta</label>
                            <input id="claims-date-to" type="date" value={claimDateTo} onChange={(event) => { setClaimDateTo(event.target.value); setPage(1); }} />
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="claims-min-amount">Monto mínimo</label>
                            <input id="claims-min-amount" type="number" min="0" value={minAmount} onChange={(event) => { setMinAmount(event.target.value); setPage(1); }} />
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="claims-max-amount">Monto máximo</label>
                            <input id="claims-max-amount" type="number" min="0" value={maxAmount} onChange={(event) => { setMaxAmount(event.target.value); setPage(1); }} />
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="siniestros-table-wrap">
                <table className="siniestros-table">
                    <thead>
                        <tr>
                            <th>Número de siniestro</th>
                            <th>Cliente</th>
                            <th>Vehiculo</th>
                            <th>Fecha</th>
                            <th>Monto</th>
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

            <SiniestroFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={handleSaveSuccess}
                editingSiniestro={editingSiniestro}
                viewingSiniestro={viewingSiniestro}
                canMutate={canMutate}
            />

            <ConfirmDialog
                isOpen={!!claimToToggle}
                title={`${claimToToggle?.is_active ? 'Anular' : 'Reactivar'} siniestro`}
                message={`Esta acción ${claimToToggle?.is_active ? 'anulará' : 'reactivará'} el siniestro ${claimToToggle?.claim_number || ('#' + (claimToToggle?.id ?? ''))}. ¿Desea continuar?`}
                confirmLabel={claimToToggle?.is_active ? 'Anular' : 'Reactivar'}
                variant={claimToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setClaimToToggle(null)}
                onConfirm={handleToggleStatus}
            />

            <ConfirmDialog
                isOpen={!!pendingReportClaim}
                title="Siniestro guardado"
                message="Siniestro guardado correctamente. ¿Deseas reportarlo ahora a la aseguradora?"
                confirmLabel="Sí, reportar ahora"
                cancelLabel="No, reportar después"
                variant="info"
                isLoading={isReportingFromCreate}
                onCancel={() => setPendingReportClaim(null)}
                onConfirm={handleConfirmReport}
            />
        </div>
    );
}