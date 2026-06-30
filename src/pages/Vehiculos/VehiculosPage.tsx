/// <summary>
/// Componente VehiculosPage.tsx
/// </summary>
import './VehiculosPage.css';
import { useEffect, useState } from 'react';
import { FiEdit2, FiEye, FiPlus, FiPower } from 'react-icons/fi';
import type { Vehiculo } from '../../types/vehiculo';
import type { Cliente } from '../../types/cliente';
import { getVehiculosPage, activateVehiculo, deactivateVehiculo } from '../../services/vehiculos.service';
import { getClientes } from '../../services/clientes.service';
import { useAuth } from '../../context/AuthContext';
import { canDeleteVehicles, canManageVehicles } from '../../utils/roles';
import ListControls, { ListPagination } from '../../components/common/ListControls';
import { DEFAULT_PAGE_SIZE } from '../../utils/pagination';
import VehiculoFormModal from './components/VehiculoFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function VehiculosPage() {
    const { currentUser } = useAuth();
    const canMutate = canManageVehicles(currentUser?.role);
    const canDelete = canDeleteVehicles(currentUser?.role);

    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
    const [viewingVehiculo, setViewingVehiculo] = useState<Vehiculo | null>(null);
    const [vehiculoToToggle, setVehiculoToToggle] = useState<Vehiculo | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchDraft, setSearchDraft] = useState('');
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');
    const [ordering, setOrdering] = useState('-created_at');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            getVehiculosPage({
                search,
                year,
                is_active: activeFilter,
                ordering,
                page,
                page_size: DEFAULT_PAGE_SIZE,
            }),
            getClientes({ page_size: 100 }),
        ])
            .then(([vehiculosData, clientesData]) => {
                setVehiculos(vehiculosData.results);
                setTotalCount(vehiculosData.count);
                setClientes(clientesData);
            })
            .catch(err => setErrorMsg(`Error al cargar datos: ${err.message}`))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [search, year, activeFilter, ordering, page]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchDraft.trim());
    };

    const clearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setYear('');
        setActiveFilter('true');
        setOrdering('-created_at');
        setPage(1);
    };

    const hasActiveFilters = searchDraft !== '' || year !== '' || activeFilter !== 'true' || ordering !== '-created_at';

    const openNew = () => {
        if (!canMutate) return;
        setEditingVehiculo(null);
        setViewingVehiculo(null);
        setModalOpen(true);
    };

    const openEdit = (vehiculo: Vehiculo) => {
        if (!canMutate) return;
        setEditingVehiculo(vehiculo);
        setViewingVehiculo(null);
        setModalOpen(true);
    };

    const openView = (vehiculo: Vehiculo) => {
        setEditingVehiculo(null);
        setViewingVehiculo(vehiculo);
        setModalOpen(true);
    };

    const handleToggleStatus = async () => {
        if (!canMutate) return;
        if (!vehiculoToToggle) return;
        const shouldActivate = !vehiculoToToggle.is_active;
        setIsTogglingStatus(true);
        try {
            if (shouldActivate) {
                await activateVehiculo(vehiculoToToggle.id);
            } else {
                await deactivateVehiculo(vehiculoToToggle.id);
            }
            setVehiculoToToggle(null);
            loadData();
        } catch (err: any) {
            if (err?.isGlobal) return;
            setErrorMsg(`Error al ${shouldActivate ? 'activar' : 'desactivar'}: ${err.message}`);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const getClienteName = (id: number) => {
        const cliente = clientes.find(item => item.id === id);
        if (!cliente) return 'Cliente no disponible';
        return `${cliente.first_names} ${cliente.last_names}`.trim();
    };

    const renderTableBody = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={7} className="td-empty">Cargando vehículos...</td>
                </tr>
            );
        }
        if (vehiculos.length === 0) {
            return (
                <tr>
                    <td colSpan={7} className="td-empty">No hay vehículos registrados.</td>
                </tr>
            );
        }
        return vehiculos.map(vehiculo => (
            <tr key={vehiculo.id}>
                <td>{vehiculo.license_plate}</td>
                <td>{vehiculo.brand || '-'}</td>
                <td>{vehiculo.model || '-'}</td>
                <td>{getClienteName(vehiculo.owner_customer)}</td>
                <td>{vehiculo.year}</td>
                <td>
                    <span className={`estado-badge estado-badge--${vehiculo.is_active ? 'activo' : 'inactivo'}`}>
                        {vehiculo.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div className="action-btns">
                        <button className="action-btn action-btn--view" onClick={() => openView(vehiculo)}>
                            <FiEye aria-hidden="true" />
                            <span>Ver</span>
                        </button>
                        {canMutate && (
                            <button className="action-btn action-btn--edit" onClick={() => openEdit(vehiculo)}>
                                <FiEdit2 aria-hidden="true" />
                                <span>Editar</span>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                className={`action-btn ${vehiculo.is_active ? 'action-btn--delete' : 'action-btn--activate'}`}
                                onClick={() => setVehiculoToToggle(vehiculo)}
                            >
                                <FiPower aria-hidden="true" />
                                <span>{vehiculo.is_active ? 'Desactivar' : 'Activar'}</span>
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <div className="vehiculos-page">
            <div className="vehiculos-header">
                <h1 className="vehiculos-title">Gestión de vehículos</h1>
                {canMutate && (
                    <button className="btn-new-vehiculo" onClick={openNew}>
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

            <ListControls
                search={searchDraft}
                onSearchChange={setSearchDraft}
                onSubmit={applyFilters}
                onClear={clearFilters}
                searchPlaceholder="Buscar por placa, marca o modelo"
                ordering={ordering}
                onOrderingChange={(value) => { setOrdering(value); setPage(1); }}
                orderingOptions={[
                    { value: '-created_at', label: 'Más recientes' },
                    { value: 'license_plate', label: 'Placa' },
                    { value: 'brand', label: 'Marca' },
                    { value: 'model', label: 'Modelo' },
                    { value: 'year', label: 'Año' },
                ]}
                filters={(
                    <>
                        <div className="list-controls__field">
                            <label htmlFor="vehiculos-year">Año</label>
                            <input id="vehiculos-year" type="number" value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }} />
                        </div>
                        <div className="list-controls__field">
                            <label htmlFor="vehiculos-active">Estado</label>
                            <select id="vehiculos-active" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
                                <option value="">Todos</option>
                                <option value="true">Activos</option>
                                <option value="false">Inactivos</option>
                            </select>
                        </div>
                    </>
                )}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="vehiculos-table-wrap">
                <table className="vehiculos-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Propietario</th>
                            <th>Año</th>
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

            <VehiculoFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaveSuccess={loadData}
                editingVehiculo={editingVehiculo}
                viewingVehiculo={viewingVehiculo}
                canMutate={canMutate}
                clientesProps={clientes}
            />

            <ConfirmDialog
                isOpen={!!vehiculoToToggle}
                title={`${vehiculoToToggle?.is_active ? 'Desactivar' : 'Activar'} vehículo`}
                message={`Esta acción ${vehiculoToToggle?.is_active ? 'desactivará' : 'activará'} el vehículo ${vehiculoToToggle?.license_plate ?? ''}. ¿Desea continuar?`}
                confirmLabel={vehiculoToToggle?.is_active ? 'Desactivar' : 'Activar'}
                variant={vehiculoToToggle?.is_active ? 'danger' : 'warning'}
                isLoading={isTogglingStatus}
                onCancel={() => setVehiculoToToggle(null)}
                onConfirm={handleToggleStatus}
            />
        </div>
    );
}