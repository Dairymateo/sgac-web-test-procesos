/// <summary>
/// Componente PoliciesPage.tsx
/// </summary>
import './PoliciesPage.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiEdit2, FiEye, FiPlus, FiPower } from 'react-icons/fi';
import type { Policy, PolicyDocumentType, PolicyStatus, PolicyType } from '../../types/policy';
import type { Aseguradora } from '../../types/aseguradora';
import type { Cliente } from '../../types/cliente';
import { activatePolicy, deactivatePolicy, getPoliciesPage, getPolicy } from '../../services/policies.service';
import { getAseguradoras } from '../../services/aseguradoras.service';
import { getClientes } from '../../services/clientes.service';
import { useAuth } from '../../context/AuthContext';
import { canDeactivatePolicies, canManagePolicies } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PolicyFormModal from './components/PolicyFormModal';

const STATUS_LABELS: Record<PolicyStatus, string> = {
    draft: 'Borrador',
    sent_to_insurer: 'Enviada a aseguradora',
    pending_document: 'Pendiente de documento',
    active: 'Activa',
    expired: 'Vencida',
    cancelled: 'Cancelada',
};

const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
    individual: 'Individual',
    fleet: 'Flota',
};

const DOCUMENT_TYPE_LABELS: Record<PolicyDocumentType, string> = {
    new: 'Nueva',
    renewal: 'Renovación',
    endorsement_addition: 'Anexo adición',
    endorsement_inclusion: 'Anexo inclusión',
};

function formatCurrency(value?: string | null): string {
    if (!value) return '-';
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return value;
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(parsed);
}

export default function PoliciesPage() {
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const canMutate = canManagePolicies(currentUser?.role);
    const canDeactivate = canDeactivatePolicies(currentUser?.role);

    const [policies, setPolicies] = useState<Policy[]>([]);
    const [insurers, setInsurers] = useState<Aseguradora[]>([]);
    const [customers, setCustomers] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
    const [policyToToggle, setPolicyToToggle] = useState<Policy | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [policyTypeFilter, setPolicyTypeFilter] = useState('');
    const [documentTypeFilter, setDocumentTypeFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [ordering, setOrdering] = useState('-created_at');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            getPoliciesPage({
                search,
                status: statusFilter,
                policy_type: policyTypeFilter,
                document_type: documentTypeFilter,
                is_active: activeFilter,
                ordering,
                page,
                page_size: DEFAULT_PAGE_SIZE,
            }),
            getAseguradoras({ page_size: 100 }),
            getClientes({ page_size: 100 }),
        ])
            .then(([policiesData, insurersData, customersData]) => {
                setPolicies(policiesData.results);
                setTotalCount(policiesData.count);
                setInsurers(insurersData);
                setCustomers(customersData);
            })
            .catch(err => setErrorMsg(`Error al cargar datos: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [search, statusFilter, policyTypeFilter, documentTypeFilter, activeFilter, ordering, page]);

    useEffect(() => {
        const policyId = Number(searchParams.get('policy'));
        if (!policyId) return;

        getPolicy(policyId)
            .then(policy => {
                setEditingPolicy(null);
                setViewingPolicy(policy);
                setModalOpen(true);
            })
            .catch(err => setErrorMsg(`Error al cargar poliza: ${err.message}`))
            .finally(() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('policy');
                setSearchParams(nextParams, { replace: true });
            });
    }, [searchParams, setSearchParams]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setStatusFilter('');
        setPolicyTypeFilter('');
        setDocumentTypeFilter('');
        setActiveFilter('true');
        setOrdering('-created_at');
        setPage(1);
    };

    const openNew = () => {
        if (!canMutate) return;
        setEditingPolicy(null);
        setViewingPolicy(null);
        setModalOpen(true);
    };

    const openEdit = (policy: Policy) => {
        if (!canMutate) return;
        setEditingPolicy(policy);
        setViewingPolicy(null);
        setModalOpen(true);
    };

    const openView = (policy: Policy) => {
        setEditingPolicy(null);
        setViewingPolicy(policy);
        setModalOpen(true);
    };

    const openEditFromView = (policy: Policy) => {
        setViewingPolicy(null);
        setEditingPolicy(policy);
    };

    const handleToggleStatus = async () => {
        if (!canDeactivate || !policyToToggle) return;
        const shouldActivate = !policyToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            if (shouldActivate) {
                await activatePolicy(policyToToggle.id);
            } else {
                await deactivatePolicy(policyToToggle.id);
            }
            setPolicyToToggle(null);
            loadData();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const getInsurerName = (id: number) => insurers.find(item => item.id === id)?.name || 'Aseguradora no disponible';
    const getCustomerName = (id: number) => {
        const customer = customers.find(item => item.id === id);
        if (!customer) return 'Cliente no disponible';
        const fullName = `${customer.first_names} ${customer.last_names}`.trim();
        return customer.customer_code ? `${customer.customer_code} - ${fullName}` : fullName;
    };
    const hasActiveFilters = searchDraft !== '' || statusFilter !== '' || policyTypeFilter !== '' || documentTypeFilter !== '' || activeFilter !== 'true' || ordering !== '-created_at';

    const renderTableBody = () => {
        if (loading) {
            return <tr><td colSpan={8} className="td-empty">Cargando pólizas...</td></tr>;
        }
        if (policies.length === 0) {
            return <tr><td colSpan={8} className="td-empty">No hay pólizas registradas.</td></tr>;
        }
        return policies.map(policy => (
            <tr key={policy.id}>
                <td>
                    <div className="policy-number-cell">
                        <span className={`policy-reg-dot policy-reg-dot--${policy.is_active ? 'active' : 'inactive'}`} title={policy.is_active ? 'Registro activo' : 'Registro inactivo'} />
                        {policy.policy_number}
                    </div>
                </td>
                <td>{getInsurerName(policy.insurer)}</td>
                <td>{getCustomerName(policy.insured_customer)}</td>
                <td>{policy.valid_from} / {policy.valid_until}</td>
                <td>{POLICY_TYPE_LABELS[policy.policy_type]}</td>
                <td>{formatCurrency(policy.total_amount)}</td>
                <td>
                    <span className={`policy-status-badge policy-status-badge--${policy.status}`}>
                        {STATUS_LABELS[policy.status]}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button className="action-btn action-btn--view" onClick={() => openView(policy)}><FiEye aria-hidden="true" /><span>Ver</span></button>
                        {canMutate && ['draft', 'sent_to_insurer', 'pending_document'].includes(String(policy.status).toLowerCase().trim()) && <button className="action-btn action-btn--edit" onClick={() => openEdit(policy)}><FiEdit2 aria-hidden="true" /><span>Gestionar</span></button>}
                        {canDeactivate && (
                            <button className={`action-btn ${policy.is_active ? 'action-btn--delete' : 'action-btn--activate'}`} onClick={() => setPolicyToToggle(policy)}>
                                <FiPower aria-hidden="true" />
                                <span>{policy.is_active ? 'Desactivar' : 'Activar'}</span>
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className="policies-page">
            <div className="policies-header">
                <h1 className="policies-title">Gestión de pólizas</h1>
                {canMutate && (
                    <button className="btn-new-policy" onClick={openNew}>
                        <FiPlus aria-hidden="true" />
                        <span>Nueva</span>
                    </button>
                )}
            </div>

            {errorMsg && (
                <div className="action-error" role="alert">
                    {errorMsg}
                    <button onClick={() => setErrorMsg(null)} className="btn-close-error" aria-label="Cerrar">x</button>
                </div>
            )}

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por póliza, cliente o aseguradora"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'policy_number', label: 'Número de póliza' },
                    { value: 'valid_from', label: 'Vigencia desde' },
                    { value: 'valid_until', label: 'Vigencia hasta' },
                    { value: 'status', label: 'Estado' },
                    { value: 'total_amount', label: 'Total' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="policy-status">Estado</label>
                            <select id="policy-status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="policy-type">Tipo</label>
                            <select id="policy-type" value={policyTypeFilter} onChange={(event) => { setPolicyTypeFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                {Object.entries(POLICY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="policy-document-type">Documento</label>
                            <select id="policy-document-type" value={documentTypeFilter} onChange={(event) => { setDocumentTypeFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="policy-active">Registro</label>
                            <select id="policy-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="true">Activos</option>
                                <option value="false">Inactivos</option>
                            </select>
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="policies-table-wrap">
                <table className="policies-table">
                    <thead>
                        <tr>
                            <th>Póliza</th>
                            <th>Aseguradora</th>
                            <th>Cliente</th>
                            <th>Vigencia</th>
                            <th>Tipo</th>
                            <th>Total</th>
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

            <PolicyFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={loadData}
                editingPolicy={editingPolicy}
                viewingPolicy={viewingPolicy}
                canMutate={canMutate}
                onOpenEdit={canMutate ? openEditFromView : undefined}
            />

            <ConfirmDialog
                isOpen={!!policyToToggle}
                title={`${policyToToggle?.is_active ? 'Desactivar' : 'Activar'} póliza`}
                message={`Esta acción ${policyToToggle?.is_active ? 'desactivará' : 'activará'} la póliza ${policyToToggle?.policy_number ?? ''}. ¿Desea continuar?`}
                confirmLabel={policyToToggle?.is_active ? 'Desactivar' : 'Activar'}
                variant={policyToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setPolicyToToggle(null)}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}