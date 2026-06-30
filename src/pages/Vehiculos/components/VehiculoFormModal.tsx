/// <summary>
/// Componente VehiculoFormModal.tsx
/// </summary>
import './VehiculoFormModal.css';
import { useEffect, useState } from 'react';
import type { Cliente } from '../../../types/cliente';
import type { Vehiculo, VehicleRead, VehicleType, VehicleUse, VehicleWritePayload } from '../../../types/vehiculo';
import { createVehiculo, updateVehiculo } from '../../../services/vehiculos.service';
import { getClientes } from '../../../services/clientes.service';
import { fetchStates, fetchCities } from '../../../services/geo.service';
import type { GeoState, GeoCity } from '../../../services/geo.service';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: () => void;
    readonly editingVehiculo?: VehicleRead | null;
    readonly viewingVehiculo?: VehicleRead | null;
    readonly canMutate: boolean;
    readonly clientesProps?: Cliente[];
}

type TabKey = 'general' | 'technical' | 'valuation' | 'location';

type VehicleFormState = Omit<VehicleWritePayload, 'commercial_value'> & {
    commercial_value: string;
};

const EMPTY_FORM: VehicleFormState = {
    owner_customer: 0,
    brand: '',
    model: '',
    vehicle_type: 'jeep',
    vehicle_use: 'tourism',
    engine: '',
    chassis: '',
    license_plate: '',
    year: new Date().getFullYear(),
    commercial_value: '',
    color: '',
    province: '',
    city: '',
};

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
    { value: 'jeep', label: 'Jeep' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'truck', label: 'Camion' },
    { value: 'motorcycle', label: 'Motocicleta' },
    { value: 'other', label: 'Otro' },
];

const VEHICLE_USE_OPTIONS: { value: VehicleUse; label: string }[] = [
    { value: 'tourism', label: 'Turismo' },
    { value: 'personal', label: 'Personal' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'work', label: 'Trabajo' },
    { value: 'other', label: 'Otro' },
];

function toFormState(source: Vehiculo): VehicleFormState {
    return {
        owner_customer: source.owner_customer,
        brand: source.brand,
        model: source.model,
        vehicle_type: source.vehicle_type,
        vehicle_use: source.vehicle_use,
        engine: source.engine,
        chassis: source.chassis,
        license_plate: source.license_plate,
        year: source.year,
        commercial_value: source.commercial_value ?? '',
        color: source.color,
        province: source.province,
        city: source.city,
    };
}

function getModalTitle(viewing?: Vehiculo | null, editing?: Vehiculo | null): string {
    if (viewing) return 'Detalles del Vehiculo';
    if (editing) return 'Editar Vehiculo';
    return 'Registrar Vehiculo';
}

function isActiveCliente(cliente: Cliente): boolean {
    return cliente.is_active !== false;
}

function formatClienteOption(cliente: Cliente): string {
    const code = cliente.customer_code ? `${cliente.customer_code} - ` : '';
    const name = `${cliente.first_names} ${cliente.last_names}`.trim();
    return `${code}${name} (${cliente.document_number})`;
}

function parseApiFieldErrors(errorMessage: string): Record<string, string> {
    const errors: Record<string, string> = {};
    const splitErrors = errorMessage.split(';').map((item) => item.trim()).filter(Boolean);

    for (const item of splitErrors) {
        const separatorIndex = item.indexOf(':');
        if (separatorIndex < 0) continue;
        const field = item.slice(0, separatorIndex).trim();
        const message = item.slice(separatorIndex + 1).trim();
        if (field && message) {
            const isGenericKey = ['detail', 'non_field_errors', 'error', 'message'].includes(field);
            const hasSpace = field.includes(' ');
            if (!isGenericKey && !hasSpace) {
                errors[field] = message;
            }
        }
    }

    return errors;
}

function validatePositiveDecimal(value: string): boolean {
    if (!value) return true;
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed > 0;
}

function validateVehicle(form: VehicleFormState): Record<string, string> {
    const errors: Record<string, string> = {};
    const plate = String(form.license_plate || '').trim().toUpperCase();
    const maxYear = new Date().getFullYear() + 1;

    if (!form.owner_customer) errors.owner_customer = 'Debe seleccionar un cliente.';
    if (!form.brand) errors.brand = 'Campo requerido.';
    if (!form.model) errors.model = 'Campo requerido.';
    if (!form.engine) errors.engine = 'Campo requerido.';
    if (form.engine.length < 5) errors.engine = 'Debe tener minimo 5 caracteres.';
    if (!form.chassis) errors.chassis = 'Campo requerido.';
    if (form.chassis.length < 10) errors.chassis = 'Debe tener minimo 10 caracteres.';
    if (!plate) {
        errors.license_plate = 'Campo requerido.';
    } else if (!/^[A-Z0-9-]{6,10}$/.test(plate)) {
        errors.license_plate = 'Placa invalida: use 6 a 10 caracteres alfanumericos o guion.';
    }
    if (!Number.isInteger(form.year) || form.year < 1950 || form.year > maxYear) {
        errors.year = `El año debe estar entre 1950 y ${maxYear}.`;
    }
    if (!validatePositiveDecimal(form.commercial_value)) {
        errors.commercial_value = 'Debe ser mayor a 0.';
    }
    if (!form.color) errors.color = 'Campo requerido.';
    if (!form.province) errors.province = 'Campo requerido.';
    if (!form.city) errors.city = 'Campo requerido.';

    return errors;
}

function buildVehiclePayload(form: VehicleFormState): VehicleWritePayload {
    const payload: VehicleWritePayload = {
        owner_customer: form.owner_customer,
        brand: form.brand.trim().toUpperCase(),
        model: form.model.trim().toUpperCase(),
        vehicle_type: form.vehicle_type,
        vehicle_use: form.vehicle_use,
        engine: form.engine.trim().toUpperCase(),
        chassis: form.chassis.trim().toUpperCase(),
        license_plate: form.license_plate.trim().toUpperCase(),
        year: form.year,
        color: form.color.trim().toUpperCase(),
        province: form.province.trim().toUpperCase(),
        city: form.city.trim().toUpperCase(),
    };

    if (form.commercial_value) payload.commercial_value = form.commercial_value.trim();
    return payload;
}

function getTabForError(errors: Record<string, string>): TabKey {
    const firstField = Object.keys(errors).find(field => errors[field]);
    if (!firstField) return 'general';
    if (['engine', 'chassis', 'color'].includes(firstField)) return 'technical';
    if (['commercial_value'].includes(firstField)) return 'valuation';
    if (['province', 'city'].includes(firstField)) return 'location';
    return 'general';
}

export default function VehiculoFormModal({
    isOpen,
    onClose,
    onSaveSuccess,
    editingVehiculo,
    viewingVehiculo,
    canMutate,
    clientesProps,
}: Props) {
    const [form, setForm] = useState<VehicleFormState>({ ...EMPTY_FORM });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<TabKey>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>(clientesProps || []);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [geoStates, setGeoStates] = useState<GeoState[]>([]);
    const [geoCities, setGeoCities] = useState<GeoCity[]>([]);

    const isReadOnly = !!viewingVehiculo || !canMutate;
    const editingId = editingVehiculo?.id ?? null;
    const selectableClientes = clientes.filter(cliente => isActiveCliente(cliente) || cliente.id === form.owner_customer);

    useEffect(() => {
        if (!isOpen) return;
        setCurrentTab('general');
        setFieldErrors({});
        setError(null);

        if (editingVehiculo) {
            setForm(toFormState(editingVehiculo));
            return;
        }

        if (viewingVehiculo) {
            setForm(toFormState(viewingVehiculo));
            return;
        }

        setForm({ ...EMPTY_FORM });
    }, [isOpen, editingVehiculo, viewingVehiculo]);

    useEffect(() => {
        if (!isOpen) return;
        if (clientesProps?.length) {
            setClientes(clientesProps);
            return;
        }
        setLoadingClientes(true);
        getClientes(editingVehiculo || viewingVehiculo ? { page_size: 100 } : { is_active: true, page_size: 100 })
            .then(setClientes)
            .catch(() => setClientes([]))
            .finally(() => setLoadingClientes(false));
    }, [isOpen, clientesProps, editingVehiculo, viewingVehiculo]);

    useEffect(() => {
        fetchStates('Ecuador').then(setGeoStates).catch(() => setGeoStates([]));
    }, []);

    useEffect(() => {
        if (form.province) {
            fetchCities('Ecuador', form.province).then(setGeoCities).catch(() => setGeoCities([]));
        } else {
            setGeoCities([]);
        }
    }, [form.province]);

    if (!isOpen) return null;

    const onFieldChange = (name: keyof VehicleFormState, value: string) => {
        setForm(prev => {
            if (name === 'year') {
                return { ...prev, year: Number(value) || 0 };
            }
            if (name === 'owner_customer') {
                return { ...prev, owner_customer: Number(value) || 0 };
            }
            if (name === 'license_plate') {
                return { ...prev, license_plate: value.toUpperCase() };
            }
            return { ...prev, [name]: value };
        });

        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleProvinceChange = (value: string) => {
        setForm(prev => ({ ...prev, province: value, city: '' }));
        setGeoCities([]);
        if (fieldErrors.province || fieldErrors.city) {
            setFieldErrors(prev => ({ ...prev, province: '', city: '' }));
        }
    };

    const handleSubmit = async (event: React.SyntheticEvent) => {
        event.preventDefault();
        if (isReadOnly) {
            onClose();
            return;
        }

        const validationErrors = validateVehicle(form);
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            setError('Revise los campos requeridos.');
            setCurrentTab(getTabForError(validationErrors));
            return;
        }

        const payload = buildVehiclePayload(form);
        setIsSaving(true);
        setError(null);
        try {
            if (editingId) {
                await updateVehiculo(editingId, payload);
            } else {
                await createVehiculo(payload);
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            const rawMessage = err.message || 'Error al guardar vehículo.';
            const apiErrors = err.fieldErrors && Object.keys(err.fieldErrors).length > 0
                ? err.fieldErrors
                : parseApiFieldErrors(rawMessage);
            if (Object.keys(apiErrors).length > 0) {
                setFieldErrors(apiErrors);
                setError('Por favor, revise los campos marcados en rojo.');
            } else {
                setError(rawMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const modalTitle = getModalTitle(viewingVehiculo, editingVehiculo);
    const initialForm = editingVehiculo ? toFormState(editingVehiculo) : null;
    const hasChanges = !editingId || (initialForm ? isFormDirty(form, initialForm) : true);
    const submitLabel = getSaveButtonLabel(isSaving, !!editingId);

    return (
        <div className="modal-overlay">
            <div className="modal-box vehiculo-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{modalTitle}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="modal-tabs">
                    <button type="button" className={`tab-btn ${currentTab === 'general' ? 'active' : ''}`} onClick={() => setCurrentTab('general')}>
                        Datos Generales
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'technical' ? 'active' : ''}`} onClick={() => setCurrentTab('technical')}>
                        Ficha Tecnica
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'valuation' ? 'active' : ''}`} onClick={() => setCurrentTab('valuation')}>
                        Valores
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'location' ? 'active' : ''}`} onClick={() => setCurrentTab('location')}>
                        Ubicacion
                    </button>
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form className="modal-body-scroll" onSubmit={handleSubmit} noValidate>
                    {currentTab === 'general' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Datos Base</h3>
                                <div className="grid-2-col">
                                    <div className="form-field span-2">
                                        <label htmlFor="owner_customer">Propietario (cliente) *</label>
                                        <select
                                            id="owner_customer"
                                            name="owner_customer"
                                            value={form.owner_customer}
                                            onChange={event => onFieldChange('owner_customer', event.target.value)}
                                            disabled={isReadOnly || loadingClientes}
                                            required
                                        >
                                            <option value={0}>{loadingClientes ? 'Cargando clientes...' : 'Seleccione un cliente'}</option>
                                            {selectableClientes.map(cliente => (
                                                <option key={cliente.id} value={cliente.id}>
                                                    {formatClienteOption(cliente)}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError name="owner_customer" errors={fieldErrors} />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="license_plate">Placa *</label>
                                        <input type="text" id="license_plate" name="license_plate" value={form.license_plate} onChange={event => onFieldChange('license_plate', event.target.value)} disabled={isReadOnly} maxLength={10} required placeholder="Ej: ABC-1234" />
                                        <FieldError name="license_plate" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="year">Año *</label>
                                        <input id="year" type="number" name="year" value={form.year} onChange={event => onFieldChange('year', event.target.value)} disabled={isReadOnly} required placeholder="Ej: 2024" />
                                        <FieldError name="year" errors={fieldErrors} />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="brand">Marca *</label>
                                        <input type="text" id="brand" name="brand" value={form.brand} onChange={event => onFieldChange('brand', event.target.value)} disabled={isReadOnly} required placeholder="Ej: Toyota" />
                                        <FieldError name="brand" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="model">Modelo *</label>
                                        <input type="text" id="model" name="model" value={form.model} onChange={event => onFieldChange('model', event.target.value)} disabled={isReadOnly} required placeholder="Ej: Hilux" />
                                        <FieldError name="model" errors={fieldErrors} />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="vehicle_type">Tipo *</label>
                                        <select id="vehicle_type" name="vehicle_type" value={form.vehicle_type} onChange={event => onFieldChange('vehicle_type', event.target.value)} disabled={isReadOnly} required>
                                            {VEHICLE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="vehicle_use">Uso *</label>
                                        <select id="vehicle_use" name="vehicle_use" value={form.vehicle_use} onChange={event => onFieldChange('vehicle_use', event.target.value)} disabled={isReadOnly} required>
                                            {VEHICLE_USE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'technical' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Datos Tecnicos</h3>
                                <div className="grid-2-col">
                                    <div className="form-field">
                                        <label htmlFor="engine">Motor *</label>
                                        <input type="text" id="engine" name="engine" value={form.engine} onChange={event => onFieldChange('engine', event.target.value)} disabled={isReadOnly} required placeholder="Ej: 2TRFE-12345" />
                                        <FieldError name="engine" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="chassis">Chasis *</label>
                                        <input type="text" id="chassis" name="chassis" value={form.chassis} onChange={event => onFieldChange('chassis', event.target.value)} disabled={isReadOnly} required placeholder="Ej: 8AFCE42B0DA123456" />
                                        <FieldError name="chassis" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="color">Color *</label>
                                        <input type="text" id="color" name="color" value={form.color} onChange={event => onFieldChange('color', event.target.value)} disabled={isReadOnly} required placeholder="Ej: Blanco" />
                                        <FieldError name="color" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'valuation' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Valores</h3>
                                <div className="grid-2-col">
                                    <div className="form-field">
                                        <label htmlFor="commercial_value">Valor comercial</label>
                                        <input
                                            id="commercial_value"
                                            name="commercial_value"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.commercial_value}
                                            onChange={event => onFieldChange('commercial_value', event.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Ej: 25000.00"
                                        />
                                        <FieldError name="commercial_value" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'location' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Ubicacion</h3>
                                <div className="grid-2-col">
                                    <div className="form-field span-2">
                                        <label htmlFor="geo_country">Pais</label>
                                        <input type="text" id="geo_country" value="Ecuador" disabled />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="province">Provincia *</label>
                                        <select id="province" value={form.province} onChange={e => handleProvinceChange(e.target.value)} disabled={isReadOnly} required>
                                            <option value="">Seleccione...</option>
                                            {form.province && !geoStates.some(s => s.name === form.province) && (
                                                <option value={form.province}>{form.province}</option>
                                            )}
                                            {geoStates.map(s => <option key={s.state_code} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <FieldError name="province" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="city">Ciudad *</label>
                                        <select id="city" value={form.city} onChange={e => onFieldChange('city', e.target.value)} disabled={isReadOnly || !form.province} required>
                                            <option value="">Seleccione...</option>
                                            {form.city && !geoCities.some(c => c.name === form.city) && (
                                                <option value={form.city}>{form.city}</option>
                                            )}
                                            {geoCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <FieldError name="city" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions-fixed">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button type="submit" className="btn-primary" disabled={isSaving || (!!editingId && !hasChanges)}>
                                {submitLabel}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}