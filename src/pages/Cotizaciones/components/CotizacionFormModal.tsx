/// <summary>
/// Componente CotizacionFormModal.tsx
/// </summary>
import React, { useState, useEffect } from 'react';
import { createCotizacionML, createCotizacionDraft } from '../../../services/cotizaciones.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import type { Cliente } from '../../../types/cliente';
import type { Vehiculo } from '../../../types/vehiculo';
import type { Aseguradora } from '../../../types/aseguradora';
import ModalCloseButton from '../../../components/common/ModalCloseButton';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
}

interface VehicleRow {
    _id: string;
    vehicle: string;
    manualOverride: boolean;
    vehicleValue: string;
    overrideReason: string;
}

const createEmptyVehicleRow = (): VehicleRow => ({
    _id: crypto.randomUUID(),
    vehicle: '',
    manualOverride: false,
    vehicleValue: '',
    overrideReason: '',
});

const FIELD_LABELS_COT: Record<string, string> = {
    insured_client: 'cliente asegurado',
    insurer: 'aseguradora',
    vehicle: 'vehículo',
    vehicle_value: 'valor asegurado',
    vehicle_value_override_reason: 'motivo del ajuste',
};

const NON_FIELD_KEYS = new Set(['detail', 'non_field_errors', 'error', 'message', 'quote']);

function translateCotizacionError(field: string, message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('quotes are allowed only for individual')) {
        return 'Las cotizaciones solo se permiten para clientes de persona natural.';
    }
    if (lower.includes('must have a birth date')) {
        return 'El cliente debe tener fecha de nacimiento para calcular el riesgo.';
    }
    if (lower.includes('does not belong to the provided insured client')) {
        return 'El vehículo no pertenece al cliente asegurado seleccionado.';
    }
    if (lower.includes('justification is required')) {
        return 'Ingrese el motivo del ajuste manual.';
    }
    if (lower.includes('this field is required') || lower.includes('may not be blank') || lower.includes('may not be null')) {
        return 'Este campo es obligatorio.';
    }
    if (lower.includes('a valid number is required') || lower.includes('valid number')) {
        return 'Ingrese un valor numérico válido.';
    }
    if (lower.includes('greater than or equal to 0') || lower.includes('ensure this value is greater')) {
        return 'El valor debe ser mayor o igual a 0.';
    }
    if (lower.includes('does not exist') || lower.includes('invalid pk')) {
        return 'El registro seleccionado no existe o no está disponible.';
    }
    if (lower.includes('inactive') || lower.includes('inactiv')) {
        const label = FIELD_LABELS_COT[field];
        return label ? `El ${label} seleccionado está inactivo.` : 'El registro seleccionado está inactivo.';
    }
    if (lower.includes('not a valid choice')) {
        return 'Seleccione una opción válida.';
    }
    const label = FIELD_LABELS_COT[field];
    return label ? `Revise el campo ${label}.` : message;
}

function translateCotizacionBusinessError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('open quote already exists') || lower.includes('ya existe') || lower.includes('already exists')) {
        return 'No es posible realizar cotizaciones de vehiculos que ya cuenten con una activa o en proceso.';
    }
    return message;
}

function getNonFieldErrorMessage(error: any, fallback: string): string {
    const rawFieldErrors = error?.fieldErrors;
    if (rawFieldErrors && typeof rawFieldErrors === 'object') {
        const entry = Object.entries(rawFieldErrors).find(([field, message]) => NON_FIELD_KEYS.has(field) && message);
        if (entry) return translateCotizacionBusinessError(String(entry[1]));
    }
    if (fallback.trim().toLowerCase() === 'invalid data.') {
        return 'No se pudo crear la cotización. Si ya existe una cotización abierta para este cliente y vehículo, apruébela o rechácela antes de crear otra.';
    }
    return translateCotizacionBusinessError(fallback);
}

function getStringMessage(val: any): string {
    return Array.isArray(val) ? String(val[0]) : String(val);
}

function extractVehicleErrors(vehiclesArray: any[]): Record<number, Record<string, string>> {
    const rows: Record<number, Record<string, string>> = {};
    for (let idx = 0; idx < vehiclesArray.length; idx++) {
        const rowErr = vehiclesArray[idx];
        if (rowErr && typeof rowErr === 'object') {
            rows[idx] = {};
            for (const [f, msgs] of Object.entries(rowErr)) {
                rows[idx][f] = translateCotizacionError(f, getStringMessage(msgs));
            }
        }
    }
    return rows;
}

function extractApiErrors(err: any): {
    topLevel: Record<string, string>;
    rows: Record<number, Record<string, string>>;
} {
    const topLevel: Record<string, string> = {};
    let rows: Record<number, Record<string, string>> = {};

    const fieldErrors = err?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
        for (const [key, val] of Object.entries(fieldErrors)) {
            if (NON_FIELD_KEYS.has(key)) continue;
            
            if (key === 'vehicles' && Array.isArray(val)) {
                rows = extractVehicleErrors(val);
            } else {
                topLevel[key] = translateCotizacionError(key, getStringMessage(val));
            }
        }
    }

    return { topLevel, rows };
}

function isActiveCliente(cliente: Cliente): boolean {
    return cliente.is_active !== false;
}

function isActiveVehiculo(vehiculo: Vehiculo): boolean {
    return vehiculo.is_active !== false;
}

function isActiveAseguradora(a: Aseguradora): boolean {
    return a.is_active !== false;
}

function formatClienteOption(cliente: Cliente): string {
    const code = cliente.customer_code ? `${cliente.customer_code} - ` : '';
    const name = `${cliente.first_names} ${cliente.last_names}`.trim();
    return `${code}${name} (${cliente.document_number})`;
}

function formatVehiculoOption(vehiculo: Vehiculo): string {
    return `${vehiculo.license_plate} - ${vehiculo.brand} ${vehiculo.model} (${vehiculo.year})`;
}

function validateVehicleRow(row: VehicleRow): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!row.vehicle) {
        errs.vehicle = 'Seleccione un vehículo.';
    }
    if (row.manualOverride) {
        if (row.vehicleValue) {
            const num = Number(row.vehicleValue);
            if (Number.isNaN(num) || num <= 0) {
                errs.vehicle_value = 'Debe ser mayor a 0.';
            }
        } else {
            errs.vehicle_value = 'Ingrese el valor asegurado ajustado.';
        }
        if (!row.overrideReason.trim()) {
            errs.vehicle_value_override_reason = 'Ingrese el motivo del ajuste manual.';
        }
    }
    return errs;
}

export default function CotizacionFormModal({ isOpen, onClose, onSuccess }: Props) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);

    const [selectedClient, setSelectedClient] = useState('');
    const [selectedInsurer, setSelectedInsurer] = useState('');
    const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>([createEmptyVehicleRow()]);

    const [loadingData, setLoadingData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [topLevelErrors, setTopLevelErrors] = useState<Record<string, string>>({});
    const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});

    const eligibleClientes = clientes.filter(isActiveCliente);
    const eligibleAseguradoras = aseguradoras.filter(isActiveAseguradora);
    const vehiclesByClient = vehiculos.filter(
        v => v.owner_customer === Number(selectedClient) && isActiveVehiculo(v)
    );

    function resetForm() {
        setSelectedClient('');
        setSelectedInsurer('');
        setVehicleRows([createEmptyVehicleRow()]);
        setError(null);
        setTopLevelErrors({});
        setRowErrors({});
        setIsSaving(false);
    }

    useEffect(() => {
        if (isOpen) {
            resetForm();
            const fetchData = async () => {
                setLoadingData(true);
                try {
                    const [cData, vData, aData] = await Promise.all([
                        getClientes({ is_active: true, page_size: 100 }),
                        getVehiculos({ is_active: true, page_size: 100 }),
                        getAseguradoras({ is_active: true, page_size: 100 }),
                    ]);
                    setClientes(cData);
                    setVehiculos(vData);
                    setAseguradoras(aData);
                } catch (err: any) {
                    if (err?.isGlobal) return;
                    setError(err.message || 'Error al cargar datos.');
                } finally {
                    setLoadingData(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function updateRow(idx: number, patch: Partial<VehicleRow>) {
        setVehicleRows(prev => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
        if (rowErrors[idx]) {
            const patchedKeys = Object.keys(patch);
            setRowErrors(prev => {
                const cleared: Record<string, string> = { ...prev[idx] };
                if (patchedKeys.includes('vehicle')) delete cleared.vehicle;
                if (patchedKeys.includes('vehicleValue')) delete cleared.vehicle_value;
                if (patchedKeys.includes('overrideReason')) delete cleared.vehicle_value_override_reason;
                return { ...prev, [idx]: cleared };
            });
        }
    }

    function addRow() {
        setVehicleRows(prev => [...prev, createEmptyVehicleRow()]);
    }

    function removeRow(idx: number) {
        setVehicleRows(prev => prev.filter((_, i) => i !== idx));
        setRowErrors(prev => {
            const next: Record<number, Record<string, string>> = {};
            for (const [k, v] of Object.entries(prev)) {
                const num = Number(k);
                if (num < idx) next[num] = v;
                else if (num > idx) next[num - 1] = v;
            }
            return next;
        });
    }

    function validate(): boolean {
        let valid = true;
        const newTopLevel: Record<string, string> = {};
        const newRowErrors: Record<number, Record<string, string>> = {};

        if (!selectedClient) {
            newTopLevel.insured_client = 'Este campo es requerido.';
            valid = false;
        }
        if (!selectedInsurer) {
            newTopLevel.insurer = 'Este campo es requerido.';
            valid = false;
        }
        if (vehicleRows.length === 0) {
            newTopLevel.vehicles = 'Debe agregar al menos un vehículo.';
            valid = false;
        }

        for (const [idx, row] of vehicleRows.entries()) {
            const errs = validateVehicleRow(row);
            if (Object.keys(errs).length > 0) {
                newRowErrors[idx] = errs;
                valid = false;
            }
        }

        setTopLevelErrors(newTopLevel);
        setRowErrors(newRowErrors);
        if (!valid) setError('Revise los campos requeridos.');
        return valid;
    }

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>, isDraft: boolean) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSaving(true);
        setError(null);
        setTopLevelErrors({});
        setRowErrors({});

        const payload = {
            insured_client: Number(selectedClient),
            insurer: Number(selectedInsurer),
            vehicles: vehicleRows.map(row => ({
                vehicle: Number(row.vehicle),
                ...(row.manualOverride
                    ? {
                        vehicle_value: row.vehicleValue,
                        vehicle_value_override_reason: row.overrideReason.trim(),
                    }
                    : {}),
            })),
        };

        try {
            if (isDraft) {
                await createCotizacionDraft(payload);
            } else {
                await createCotizacionML(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            const rawMessage = err?.message || 'Error al crear la cotización.';
            const { topLevel, rows } = extractApiErrors(err);
            if (Object.keys(topLevel).length > 0 || Object.keys(rows).length > 0) {
                setTopLevelErrors(topLevel);
                setRowErrors(rows);
                setError('Por favor, revise los campos marcados en rojo.');
            } else {
                setError(getNonFieldErrorMessage(err, rawMessage));
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '680px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Nueva Cotización</h2>
                    <ModalCloseButton onClick={onClose} disabled={isSaving} />
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <div className="modal-body-scroll" style={{ padding: '0 24px 24px' }}>
                    {loadingData ? (
                        <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando datos...</p>
                    ) : (
                        <form data-testid="crear-cotizacion-form">
                            <div className="form-grid">
                                <div className="form-section">
                                    <div className="form-field">
                                        <label htmlFor="cliente">Cliente Asegurado *</label>
                                        <select
                                            id="cliente"
                                            value={selectedClient}
                                            onChange={(e) => {
                                                setSelectedClient(e.target.value);
                                                setVehicleRows([createEmptyVehicleRow()]);
                                                setRowErrors({});
                                                if (topLevelErrors.insured_client) {
                                                    setTopLevelErrors(prev => ({ ...prev, insured_client: '' }));
                                                }
                                            }}
                                            disabled={isSaving}
                                            required
                                        >
                                            <option value="">Seleccione un cliente...</option>
                                            {eligibleClientes.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {formatClienteOption(c)}
                                                </option>
                                            ))}
                                        </select>
                                        {topLevelErrors.insured_client ? <span className="field-error">{topLevelErrors.insured_client}</span> : null}
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="aseguradora">Aseguradora *</label>
                                        <select
                                            id="aseguradora"
                                            value={selectedInsurer}
                                            onChange={(e) => {
                                                setSelectedInsurer(e.target.value);
                                                if (topLevelErrors.insurer) {
                                                    setTopLevelErrors(prev => ({ ...prev, insurer: '' }));
                                                }
                                            }}
                                            disabled={isSaving}
                                            required
                                        >
                                            <option value="">Seleccione una aseguradora...</option>
                                            {eligibleAseguradoras.map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name}
                                                </option>
                                            ))}
                                        </select>
                                        {topLevelErrors.insurer ? <span className="field-error">{topLevelErrors.insurer}</span> : null}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#374151' }}>Vehículos *</h3>
                                    {topLevelErrors.vehicles ? (
                                        <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>
                                            {topLevelErrors.vehicles}
                                        </span>
                                    ) : null}

                                    {vehicleRows.map((row, idx) => {
                                        const rowErr = rowErrors[idx] ?? {};
                                        const availableVehicles = vehiclesByClient.filter(
                                            v => v.id === Number(row.vehicle) || !vehicleRows.some((r, ri) => ri !== idx && r.vehicle === String(v.id))
                                        );
                                        let vehiclePlaceholder = 'Seleccione un vehículo...';
                                        if (!selectedClient) {
                                            vehiclePlaceholder = 'Seleccione primero un cliente';
                                        } else if (availableVehicles.length === 0 && !row.vehicle) {
                                            vehiclePlaceholder = 'No hay vehículos disponibles';
                                        }

                                        return (
                                            <div
                                                key={row._id}
                                                style={{
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    marginBottom: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <strong style={{ fontSize: '0.875rem', color: '#475569' }}>
                                                        Vehículo {idx + 1}
                                                    </strong>
                                                    {vehicleRows.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn-secondary btn-sm"
                                                            onClick={() => removeRow(idx)}
                                                            disabled={isSaving}
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="form-field">
                                                    <label htmlFor={`vehicle-${idx}`}>Vehículo *</label>
                                                    <select
                                                        id={`vehicle-${idx}`}
                                                        value={row.vehicle}
                                                        onChange={(e) => updateRow(idx, {
                                                            vehicle: e.target.value,
                                                            manualOverride: false,
                                                            vehicleValue: '',
                                                            overrideReason: '',
                                                        })}
                                                        disabled={isSaving || !selectedClient}
                                                    >
                                                        <option value="">
                                                            {vehiclePlaceholder}
                                                        </option>
                                                        {availableVehicles.map(v => (
                                                            <option key={v.id} value={v.id}>
                                                                {formatVehiculoOption(v)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {rowErr.vehicle ? <span className="field-error">{rowErr.vehicle}</span> : null}
                                                </div>

                                                <div className="form-field">
                                                    <label htmlFor={`manual_override-${idx}`}>Valor asegurado</label>
                                                    <select
                                                        id={`manual_override-${idx}`}
                                                        value={row.manualOverride ? 'true' : 'false'}
                                                        onChange={(e) => {
                                                            const enabled = e.target.value === 'true';
                                                            updateRow(idx, { manualOverride: enabled, vehicleValue: '', overrideReason: '' });
                                                        }}
                                                        disabled={isSaving || !row.vehicle}
                                                    >
                                                        <option value="false">Usar valor calculado por el sistema</option>
                                                        <option value="true">Ingresar ajuste manual</option>
                                                    </select>
                                                </div>

                                                {row.manualOverride && (
                                                    <>
                                                        <div className="form-field">
                                                            <label htmlFor={`vehicle_value-${idx}`}>Valor asegurado ajustado ($) *</label>
                                                            <input
                                                                id={`vehicle_value-${idx}`}
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={row.vehicleValue}
                                                                onChange={(e) => updateRow(idx, { vehicleValue: e.target.value })}
                                                                disabled={isSaving}
                                                                placeholder="Ej: 25000.00"
                                                            />
                                                            {rowErr.vehicle_value ? <span className="field-error">{rowErr.vehicle_value}</span> : null}
                                                        </div>
                                                        <div className="form-field">
                                                            <label htmlFor={`override_reason-${idx}`}>Motivo del ajuste *</label>
                                                            <textarea
                                                                id={`override_reason-${idx}`}
                                                                rows={2}
                                                                value={row.overrideReason}
                                                                onChange={(e) => updateRow(idx, { overrideReason: e.target.value })}
                                                                disabled={isSaving}
                                                                placeholder="Ej: Valor comercial actualizado por inspeccion"
                                                            />
                                                            {rowErr.vehicle_value_override_reason ? <span className="field-error">{rowErr.vehicle_value_override_reason}</span> : null}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={addRow}
                                        disabled={isSaving || !selectedClient}
                                        style={{ width: '100%', marginTop: '4px' }}
                                    >
                                        + Agregar vehículo
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions-fixed" style={{ padding: '16px 0 0', marginTop: '16px', borderTop: 'none', background: 'transparent', display: 'flex', gap: '10px' }}>
                                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                                    Cancelar
                                </button>
                                <div style={{ flexGrow: 1 }} />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={isSaving}
                                >
                                    Guardar Borrador
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary btn-primary--accent"
                                    onClick={(e) => handleSubmit(e, false)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Creando...' : 'Crear con Scoring ML'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}