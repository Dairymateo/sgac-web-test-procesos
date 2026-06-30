/// <summary>
/// Componente CotizacionesPage.tsx
/// </summary>
import './CotizacionesPage.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiEye, FiPlus, FiSliders, FiXCircle, FiZap } from 'react-icons/fi';
import type { Cotizacion, QuoteStatus } from '../../types/cotizacion';
import { getCotizacionesPage, generateScoring } from '../../services/cotizaciones.service';
import { getVehiculo } from '../../services/vehiculos.service';
import { useAuth } from '../../context/AuthContext';
import { canManageQuotes } from '../../utils/roles';
import { getStatusUi } from './cotizacion.ui';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';

import CotizacionDetalleModal from './components/CotizacionDetalleModal';
import CotizacionAjusteModal from './components/CotizacionAjusteModal';
import CotizacionAprobarModal from './components/CotizacionAprobarModal';
import CotizacionRechazarModal from './components/CotizacionRechazarModal';
import CotizacionFormModal from './components/CotizacionFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const canGenerateScoring = (status: QuoteStatus) => status === 'draft';
const canAdjust = (status: QuoteStatus) => status === 'scoring_generated' || status === 'manually_adjusted';
const canApprove = (status: QuoteStatus) => status === 'scoring_generated' || status === 'manually_adjusted';
const canReject = (status: QuoteStatus) =>
    status === 'draft' || status === 'scoring_generated' || status === 'manually_adjusted';

function getCustomerDisplay(cotizacion: Cotizacion): string {
    return cotizacion.customer_code || 'Cliente no disponible';
}

function getVehicleDisplay(cotizacion: Cotizacion, vehicleStrs: Record<number, string>): string {
    const firstVehicle = cotizacion.vehicles?.[0];

    if (firstVehicle?.vehicle && vehicleStrs[firstVehicle.vehicle]) {
        const count = cotizacion.vehicles!.length;
        if (count > 1) {
            return cotizacion.vehicles!.map(v => vehicleStrs[v.vehicle] ?? `#${v.vehicle}`).join(', ');
        }
        return vehicleStrs[firstVehicle.vehicle];
    }

    if (firstVehicle?.license_plate) {
        let text = firstVehicle.license_plate;
        if (firstVehicle.brand) {
            text = `${firstVehicle.brand} ${firstVehicle.model ?? ''} - ${text}`;
        }
        return text;
    }

    if (firstVehicle?.vehicle) {
        const count = cotizacion.vehicles!.length;
        return count > 1 ? `${count} vehículos` : `Vehículo #${firstVehicle.vehicle}`;
    }
    return '—';
}

export default function CotizacionesPage() {
    const { currentUser } = useAuth();
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [viewingId, setViewingId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [adjustingId, setAdjustingId] = useState<number | null>(null);
    const [adjustingPremium, setAdjustingPremium] = useState<string | undefined>(undefined);
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [approvingId, setApprovingId] = useState<number | null>(null);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [scoringId, setScoringId] = useState<number | null>(null);
    const [isGeneratingScoring, setIsGeneratingScoring] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [minPremium, setMinPremium] = useState('');
    const [maxPremium, setMaxPremium] = useState('');
    const [ordering, setOrdering] = useState('-created_at');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const canMutate = canManageQuotes(currentUser?.role);
    const [vehiclePlates, setVehiclePlates] = useState<Record<number, string>>({});
    const plateCache = useRef<Record<number, string>>({});

    const enrichVehiclePlates = useCallback((cots: Cotizacion[]) => {
        const idsToFetch: number[] = [];
        for (const c of cots) {
            for (const v of c.vehicles ?? []) {
                if (v.vehicle && !v.license_plate && !plateCache.current[v.vehicle]) {
                    idsToFetch.push(v.vehicle);
                }
            }
        }
        if (idsToFetch.length === 0) return;
        const unique = [...new Set(idsToFetch)];
        Promise.allSettled(unique.map(id => getVehiculo(id))).then(results => {
            const newEntries: Record<number, string> = {};
            for (const [i, r] of results.entries()) {
                if (r.status === 'fulfilled') {
                    const v = r.value;
                    const str = `${v.brand} ${v.model} (${v.year}) - ${v.license_plate}`;
                    newEntries[unique[i]] = str;
                    plateCache.current[unique[i]] = str;
                }
            }
            if (Object.keys(newEntries).length > 0) {
                setVehiclePlates(prev => ({ ...prev, ...newEntries }));
            }
        });
    }, []);

    const loadData = useCallback(() => {
        setLoading(true);
        getCotizacionesPage({
            search,
            status: statusFilter,
            min_premium: minPremium,
            max_premium: maxPremium,
            ordering,
            page,
            page_size: DEFAULT_PAGE_SIZE,
        })
            .then(data => {
                setCotizaciones(data.results);
                setTotalCount(data.count);
                enrichVehiclePlates(data.results);
            })
            .catch(err => setErrorMsg(`Error al cargar datos: ${err.message}`))
            .finally(() => setLoading(false));
    }, [search, statusFilter, minPremium, maxPremium, ordering, page, enrichVehiclePlates]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setStatusFilter('');
        setMinPremium('');
        setMaxPremium('');
        setOrdering('-created_at');
        setPage(1);
    };

    const renderStatusBadge = (status: QuoteStatus) => {
        const ui = getStatusUi(status);
        return <span className={`status-badge ${ui.className}`}>{ui.label}</span>;
    };

    const formatCurrency = (value: string | number | undefined | null) => {
        if (value === null || value === undefined) return '-';
        const amount = Number(value);
        return Number.isNaN(amount) ? String(value) : `$${amount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;
    };

    const handleGenerateScoring = async () => {
        if (!canMutate) return;
        if (scoringId === null) return;
        setIsGeneratingScoring(true);
        try {
            await generateScoring(scoringId);
            setScoringId(null);
            loadData();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg('El servicio de cotización ha fallado. Por favor, inténtelo de nuevo más tarde.');
        } finally {
            setIsGeneratingScoring(false);
        }
    };

    const renderActions = (cotizacion: Cotizacion) => (
        <div className="action-btns">
            <button
                className="action-btn action-btn--view"
                onClick={() => {
                    setViewingId(cotizacion.id);
                    setModalOpen(true);
                }}
            >
                <FiEye aria-hidden="true" />
                <span>Ver</span>
            </button>
            {canMutate && canGenerateScoring(cotizacion.status) && (
                <button
                    className="action-btn action-btn--score"
                    onClick={() => setScoringId(cotizacion.id)}
                >
                    <FiZap aria-hidden="true" />
                    <span>Score</span>
                </button>
            )}
            {canMutate && canAdjust(cotizacion.status) && (
                <button
                    className="action-btn action-btn--edit"
                    onClick={() => {
                        setAdjustingId(cotizacion.id);
                        setAdjustingPremium(cotizacion.final_premium ?? undefined);
                        setAdjustModalOpen(true);
                    }}
                >
                    <FiSliders aria-hidden="true" />
                    <span>Ajustar</span>
                </button>
            )}
            {canMutate && canApprove(cotizacion.status) && (
                <button
                    className="action-btn action-btn--approve"
                    onClick={() => {
                        setApprovingId(cotizacion.id);
                        setApproveModalOpen(true);
                    }}
                >
                    <FiCheckCircle aria-hidden="true" />
                    <span>Aprobar</span>
                </button>
            )}
            {canMutate && canReject(cotizacion.status) && (
                <button
                    className="action-btn action-btn--reject"
                    onClick={() => {
                        setRejectingId(cotizacion.id);
                        setRejectModalOpen(true);
                    }}
                >
                    <FiXCircle aria-hidden="true" />
                    <span>Rechazar</span>
                </button>
            )}
        </div>
    );

    const renderTableBody = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={7} className="td-empty">
                        Cargando cotizaciones...
                    </td>
                </tr>
            );
        }

        if (cotizaciones.length === 0) {
            return (
                <tr>
                    <td colSpan={7} className="td-empty">
                        No hay cotizaciones registradas.
                    </td>
                </tr>
            );
        }

        return cotizaciones.map(cotizacion => (
            <tr key={cotizacion.id}>
                <td>#{cotizacion.id}</td>
                <td>{getCustomerDisplay(cotizacion)}</td>
                <td>{getVehicleDisplay(cotizacion, vehiclePlates)}</td>
                <td>{renderStatusBadge(cotizacion.status)}</td>
                <td>{formatCurrency(cotizacion.suggested_premium)}</td>
                <td>{formatCurrency(cotizacion.final_premium)}</td>
                <td>{renderActions(cotizacion)}</td>
            </tr>
        ));
    };

    return (
        <div className="cotizaciones-page">
            <div className="cotizaciones-header">
                <h1 className="cotizaciones-title">Gestión de cotizaciones</h1>
                <div className="header-actions">
                    {canMutate && (
                        <button className="btn-primary" onClick={() => setCreateModalOpen(true)}>
                            <FiPlus aria-hidden="true" />
                            <span>Nueva</span>
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && (
                <div className="action-error" role="alert">
                    {errorMsg}
                    <button
                        onClick={() => setErrorMsg(null)}
                        className="btn-close-error"
                        aria-label="Cerrar"
                    >
                        x
                    </button>
                </div>
            )}

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por número, cliente o vehículo"
                hasActiveFilters={searchDraft !== '' || statusFilter !== '' || minPremium !== '' || maxPremium !== '' || ordering !== '-created_at'}
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'status', label: 'Estado' },
                    { value: 'final_premium', label: 'Prima final' },
                    { value: 'suggested_premium', label: 'Prima sugerida' },
                    { value: 'customer_code', label: 'Cliente' },
                    { value: 'vehicle_license_plate', label: 'Placa' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="quotes-status">Estado</label>
                            <select id="quotes-status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="draft">Borrador</option>
                                <option value="scoring_generated">Scoring generado</option>
                                <option value="manually_adjusted">Ajustada</option>
                                <option value="approved">Aprobada</option>
                                <option value="rejected">Rechazada</option>
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="quotes-min-premium">Prima mínima</label>
                            <input id="quotes-min-premium" type="number" min="0" value={minPremium} onChange={(event) => { setMinPremium(event.target.value); setPage(1); }} />
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="quotes-max-premium">Prima máxima</label>
                            <input id="quotes-max-premium" type="number" min="0" value={maxPremium} onChange={(event) => { setMaxPremium(event.target.value); setPage(1); }} />
                        </div>
                    </>
                )}
            />

            <div className="cotizaciones-table-wrap">
                <table className="cotizaciones-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Vehículo</th>
                            <th>Estado</th>
                            <th>Sugerida</th>
                            <th>Final</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>{renderTableBody()}</tbody>
                </table>
            </div>

            <ListPagination page={page} count={totalCount} onPageChange={setPage} />

            <CotizacionDetalleModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setViewingId(null);
                }}
                cotizacionId={viewingId}
            />

            <CotizacionAjusteModal
                isOpen={adjustModalOpen}
                onClose={() => {
                    setAdjustModalOpen(false);
                    setAdjustingId(null);
                    setAdjustingPremium(undefined);
                }}
                onSuccess={loadData}
                cotizacionId={adjustingId}
                currentPremium={adjustingPremium}
            />

            <CotizacionAprobarModal
                isOpen={approveModalOpen}
                onClose={() => {
                    setApproveModalOpen(false);
                    setApprovingId(null);
                }}
                onSuccess={loadData}
                cotizacionId={approvingId}
            />

            <CotizacionRechazarModal
                isOpen={rejectModalOpen}
                onClose={() => {
                    setRejectModalOpen(false);
                    setRejectingId(null);
                }}
                onSuccess={loadData}
                cotizacionId={rejectingId}
            />

            <CotizacionFormModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={loadData}
            />

            <ConfirmDialog
                isOpen={scoringId !== null}
                title="Generar scoring"
                message="Esta acción consultará el modelo ML y actualizará la cotización con el resultado de riesgo. ¿Desea continuar?"
                confirmLabel="Generar"
                variant="warning"
                isLoading={isGeneratingScoring}
                onCancel={() => setScoringId(null)}
                onConfirm={handleGenerateScoring}
            />
        </div>
    );
}