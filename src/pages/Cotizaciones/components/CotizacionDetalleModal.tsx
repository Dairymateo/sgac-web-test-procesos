/// <summary>
/// Componente CotizacionDetalleModal.tsx
/// </summary>
import { useEffect, useState, Fragment } from 'react';
import type { Cotizacion, QuoteVehicle, MlResponsePayload } from '../../../types/cotizacion';
import type { Cliente } from '../../../types/cliente';
import type { Aseguradora } from '../../../types/aseguradora';
import { getCotizacionById } from '../../../services/cotizaciones.service';
import { getCliente } from '../../../services/clientes.service';
import { getAseguradora } from '../../../services/aseguradoras.service';
import { getRiskBandLabel, getRiskBandColor, formatRate, formatRiskScore, getBmFactorName, getStatusUi } from '../cotizacion.ui';

import ModalCloseButton from '../../../components/common/ModalCloseButton';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly cotizacionId: number | null;
}

function getCustomerDisplay(cotizacion: Cotizacion, cliente: Cliente | null): string {
    if (cliente) {
        const name = `${cliente.first_names} ${cliente.last_names}`.trim();
        return cliente.customer_code ? `${cliente.customer_code} - ${name}` : name;
    }
    return cotizacion.customer_code || String(cotizacion.insured_client);
}

function formatVehicleDisplay(v: QuoteVehicle): string {
    if (v.license_plate) {
        const parts = [v.license_plate];
        if (v.brand) parts.push(`${v.brand} ${v.model ?? ''}`.trim());
        return parts.join(' - ');
    }
    return `Vehículo ID ${v.vehicle}`;
}

type FormatType = 'fmt' | 'string' | 'pct' | 'bool';

const FACTOR_MAPPINGS: Record<string, { key: string; label: string; format?: FormatType }[]> = {
    bonus_malus: [
        { key: 'weighted_score', label: 'Puntuación siniestros', format: 'fmt' }
    ],
    credibility_cluster: [
        { key: 'cluster_id', label: 'ID cluster', format: 'string' },
        { key: 'cluster_size', label: 'Tamaño cluster', format: 'string' },
        { key: 'beta', label: 'Factor β (credibilidad)', format: 'fmt' },
        { key: 'cluster_median_rate', label: 'Tasa mediana cluster', format: 'fmt' },
        { key: 'cluster_rate', label: 'Tasa cluster ponderada', format: 'fmt' }
    ],
    credibility_individual: [
        { key: 'num_renewals', label: 'Nº renovaciones', format: 'string' },
        { key: 'alpha', label: 'Factor α (credibilidad)', format: 'fmt' },
        { key: 'individual_rate', label: 'Tasa individual', format: 'fmt' },
        { key: 'blended_rate', label: 'Tasa mezclada', format: 'fmt' }
    ],
    renewal_cap: [
        { key: 'max_annual_change_pct', label: 'Cambio máx. anual', format: 'pct' },
        { key: 'previous_rate', label: 'Tasa período anterior', format: 'fmt' },
        { key: 'cap_min', label: 'Tope mínimo', format: 'fmt' },
        { key: 'cap_max', label: 'Tope máximo', format: 'fmt' },
        { key: 'cap_applied', label: 'Tope aplicado', format: 'bool' }
    ]
};

function isPrimitive(v: unknown): v is string | number | boolean {
    return v !== null && typeof v !== 'object' && typeof v !== 'function';
}

function formatFactorValue(val: unknown, format: FormatType = 'string'): string {
    if (val === null || val === undefined) return '-';
    if (format === 'bool') return val ? 'Sí' : 'No';
    if (format === 'fmt' && typeof val === 'number') {
        return (val < 2 && val > 0) ? `${(val * 100).toFixed(4)}%` : String(Math.round(val));
    }
    
    if (isPrimitive(val)) {
        const strVal = String(val);
        if (format === 'pct') return `${strVal}%`;
        return strVal;
    }
    
    return JSON.stringify(val);
}

function FactorDetail({ name, detail }: Readonly<{ name: string; detail: Record<string, unknown> }>) {
    const mapping = FACTOR_MAPPINGS[name];
    if (!mapping) return null;

    const rows: [string, string][] = mapping
        .filter(m => detail[m.key] !== undefined)
        .map(m => [m.label, formatFactorValue(detail[m.key], m.format)]);

    if (rows.length === 0) return null;

    return (
        <div style={{ gridColumn: '1 / -1', marginLeft: '12px', marginBottom: '4px', padding: '6px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.775rem', color: '#64748b' }}>
            {rows.map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span>{label}:</span><span style={{ fontWeight: 500 }}>{val}</span>
                </div>
            ))}
        </div>
    );
}

function getFactorColor(factor: number): string | undefined {
    if (factor > 1) return '#dc2626';
    if (factor < 1) return '#16a34a';
    return undefined;
}

function MlRateBreakdownSection({ payload }: Readonly<{ payload: MlResponsePayload | null }>) {
    const rb = payload?.rate_breakdown;
    if (!rb) return null;
    return (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151', fontSize: '0.875rem' }}>
                Desglose de tasa
            </div>
            <div style={{ fontSize: '0.825rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                <span>Segmento:</span><span style={{ fontWeight: 500 }}>{rb.segment}</span>
                <span>Tasa base segmento:</span><span style={{ fontWeight: 500 }}>{(rb.segment_base_rate * 100).toFixed(4)}%</span>
                {rb.commercial_rate !== undefined && (
                    <>
                        <span>Tasa comercial referencia:</span>
                        <span style={{ fontWeight: 500 }}>{(rb.commercial_rate * 100).toFixed(4)}%</span>
                    </>
                )}
                <span>Factor individual:</span>
                <span style={{ fontWeight: 500, color: getFactorColor(rb.individual_factor) }}>
                    ×{rb.individual_factor.toFixed(4)}
                </span>
                {rb.factors.map(f => (
                    <Fragment key={f.name}>
                        <span>{getBmFactorName(f.name)}:</span>
                        <span style={{ fontWeight: 500, color: getFactorColor(f.factor) }}>
                            ×{f.factor.toFixed(4)}
                        </span>
                        {f.detail && Object.keys(f.detail).length > 0 ? (
                            <FactorDetail name={f.name} detail={f.detail} />
                        ) : null}
                    </Fragment>
                ))}
                <span>Tasa pre-tope:</span><span style={{ fontWeight: 500 }}>{(rb.pre_cap_rate * 100).toFixed(4)}%</span>
                {rb.cap_applied ? <><span>Tope aplicado:</span><span style={{ color: '#d97706', fontWeight: 500 }}>Sí</span></> : null}
                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Tasa final:</span>
                <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{(rb.final_rate * 100).toFixed(4)}%</span>
            </div>
        </div>
    );
}

const FEATURE_LABELS: Record<string, string> = {
    customer_accidents_5y: 'Siniestros del cliente (5 años)',
    vehicle_accidents_5y: 'Siniestros del vehículo (5 años)',
    age: 'Edad del asegurado',
    vehicle_age: 'Antigüedad del vehículo',
    vehicle_value: 'Valor del vehículo',
    vehicle_type: 'Tipo de vehículo',
    vehicle_use: 'Uso del vehículo',
    province: 'Provincia',
    city: 'Ciudad',
    cluster: 'Segmento de cluster',
    tasa_base: 'Tasa base',
    bonus_malus: 'Bonus-Malus',
    context_accidents_5y: 'Siniestros contexto (5 años)',
    context_loss_amount_5y: 'Monto siniestros contexto (5 años)',
    vehicle_loss_amount_5y: 'Monto siniestros vehículo (5 años)',
};

function featureLabel(feature: string): string {
    return FEATURE_LABELS[feature] ?? feature.replaceAll('_', ' ');
}

function MlExplainabilitySection({ payload }: Readonly<{ payload: MlResponsePayload | null }>) {
    const expl = payload?.explainability;
    if (!expl) return null;
    const factors = expl.top_factors ?? expl.feature_contributions ?? [];
    if (factors.length === 0) return null;
    return (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fefce8', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151', fontSize: '0.875rem' }}>
                Factores explicativos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {factors.map(f => (
                    <div key={f.feature} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                        <span style={{ color: '#44403c' }}>{featureLabel(f.feature)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#78716c' }}>{f.value_used !== null && f.value_used !== undefined ? String(f.value_used) : '-'}</span>
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: f.contribution === 'negative' ? '#fee2e2' : '#dcfce7',
                                color: f.contribution === 'negative' ? '#dc2626' : '#16a34a',
                            }}>
                                {f.contribution === 'negative' ? '↑ riesgo' : '↓ riesgo'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MlTrazabilidadSection({ payload, cotizacion }: Readonly<{ payload: MlResponsePayload | null; cotizacion: Cotizacion }>) {
    const modelVersion = payload?.model_version ?? cotizacion.model_version;
    const inferenceId = payload?.inference_id ?? cotizacion.inference_id;
    const inferenceAt = payload?.inference_at ?? cotizacion.inference_at;
    if (!modelVersion && !inferenceId && !inferenceAt) return null;
    const formatDate = (iso: string | undefined | null) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' }); }
        catch { return iso; }
    };
    return (
        <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Trazabilidad ML</div>
            {modelVersion ? <div>Modelo: <span style={{ fontFamily: 'monospace' }}>{modelVersion}</span></div> : null}
            {inferenceId ? <div>Inference ID: <span style={{ fontFamily: 'monospace' }}>{inferenceId}</span></div> : null}
            {inferenceAt ? <div>Generado: {formatDate(inferenceAt)}</div> : null}
        </div>
    );
}

function resolveVehiclePayload(raw: MlResponsePayload | null | undefined): MlResponsePayload | null {
    if (!raw) return null;
    const wrapped = raw as { vehicles?: MlResponsePayload[] };
    if (Array.isArray(wrapped.vehicles) && wrapped.vehicles.length > 0) {
        return wrapped.vehicles[0];
    }
    return raw;
}

export default function CotizacionDetalleModal({ isOpen, onClose, cotizacionId }: Props) {
    const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [aseguradora, setAseguradora] = useState<Aseguradora | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && cotizacionId !== null) {

            setLoading(true);
            setError(null);
            setCliente(null);
            setAseguradora(null);
            getCotizacionById(cotizacionId)
                .then(cot => {
                    setCotizacion(cot);

                    getCliente(cot.insured_client).then(setCliente).catch(() => {});
                    if (cot.insurer) {
                        getAseguradora(cot.insurer).then(setAseguradora).catch(() => {});
                    }
                })
                .catch(err => setError(err.message || 'Error al obtener los detalles de la cotización.'))
                .finally(() => setLoading(false));
        } else {
            setCotizacion(null);
            setCliente(null);
            setAseguradora(null);
        }
    }, [isOpen, cotizacionId]);

    if (!isOpen) return null;

    const formatCurrency = (val: string | number | undefined | null) => {
        if (val === null || val === undefined || val === '') return '-';
        const num = Number(val);
        return Number.isNaN(num) ? String(val) : `$${num.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;
    };

    const renderContent = () => {
        if (loading) return <p>Cargando detalles...</p>;
        if (!cotizacion) return <p>No se encontraron datos.</p>;

        const vehiclesList = cotizacion.vehicles ?? [];

        return (
            <div className="form-grid">
                <div className="form-section">
                    <h3>Información General</h3>
                    <div className="grid-2-col">
                        <div className="form-field">
                            <strong>ID Cotización:</strong> {cotizacion.id}
                        </div>
                        <div className="form-field">
                            <strong>Estado:</strong>{' '}
                            <span className={`estado-badge estado-badge--${cotizacion.status.toLowerCase()}`}>
                                {getStatusUi(cotizacion.status).label}
                            </span>
                        </div>
                        <div className="form-field">
                            <strong>Cliente:</strong> {getCustomerDisplay(cotizacion, cliente)}
                        </div>
                        <div className="form-field">
                            <strong>Aseguradora:</strong>{' '}
                            {aseguradora
                                ? aseguradora.name
                                : cotizacion.insurer_name ?? `ID ${cotizacion.insurer}`}
                        </div>
                    </div>

                    {cotizacion.policy_id ? (
                        <div className="form-field" style={{ marginTop: '12px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                            <strong style={{ color: '#16a34a' }}>Póliza creada:</strong>{' '}
                            <span style={{ color: '#15803d' }}>
                                #{cotizacion.policy_id}
                                {cotizacion.policy_status ? ` · ${cotizacion.policy_status}` : ''}
                            </span>
                        </div>
                    ) : null}
                </div>

                {vehiclesList.length > 0 ? (
                    <div className="form-section">
                        <h3>Vehículos</h3>
                        {vehiclesList.map((v, i) => (
                            <div
                                key={v.vehicle}
                                style={{
                                    padding: '10px 12px',
                                    background: '#f8fafc',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '8px',
                                    fontSize: '0.9rem',
                                }}
                            >
                                <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    Vehículo {i + 1}: {formatVehicleDisplay(v)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', color: '#64748b', flexWrap: 'wrap' }}>
                                    {v.vehicle_value ? <span>Valor asegurado: {formatCurrency(v.vehicle_value)}</span> : null}
                                    {v.suggested_premium ? <span>Prima sugerida: {formatCurrency(v.suggested_premium)}</span> : null}
                                    {v.final_premium ? <span>Prima final: {formatCurrency(v.final_premium)}</span> : null}
                                    {v.vehicle_value_override_reason ? (
                                        <span style={{ fontStyle: 'italic' }}>Ajuste: {v.vehicle_value_override_reason}</span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                        {cotizacion.total_vehicle_value ? (
                            <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.875rem', marginTop: '4px' }}>
                                Valor total asegurado: <strong>{formatCurrency(cotizacion.total_vehicle_value)}</strong>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="form-section">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Scoring ML
                        {(() => {
                            const mlPayload = resolveVehiclePayload(cotizacion.ml_response_payload);
                            const isRenewal = (mlPayload?.rate_breakdown?.factors?.length ?? 0) > 0;
                            return (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: isRenewal ? '#eff6ff' : '#f0fdf4',
                                    color: isRenewal ? '#1d4ed8' : '#16a34a',
                                    border: `1px solid ${isRenewal ? '#bfdbfe' : '#bbf7d0'}`,
                                }}>
                                    {isRenewal ? 'Renovación' : 'Cliente nuevo'}
                                </span>
                            );
                        })()}
                    </h3>
                    <div className="grid-2-col">
                        <div className="form-field">
                            <strong>Tasa sugerida:</strong>{' '}
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1d4ed8' }}>
                                {formatRate(cotizacion.suggested_rate)}
                            </span>
                        </div>
                        <div className="form-field">
                            <strong>Prima sugerida:</strong> {formatCurrency(cotizacion.suggested_premium)}
                        </div>
                        <div className="form-field">
                            <strong>Prima final:</strong> {formatCurrency(cotizacion.final_premium)}
                        </div>
                        <div className="form-field">
                            <strong>Banda de riesgo:</strong>{' '}
                            <span style={{
                                fontWeight: 700,
                                color: getRiskBandColor(cotizacion.risk_band),
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: `${getRiskBandColor(cotizacion.risk_band)}18`,
                            }}>
                                {getRiskBandLabel(cotizacion.risk_band)}
                            </span>
                        </div>
                    </div>

                    {/* Score de riesgo con barra visual */}
                    {cotizacion.risk_score !== null && cotizacion.risk_score !== undefined ? (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.875rem' }}>
                                <strong>Score de riesgo</strong>
                                <span style={{ color: getRiskBandColor(cotizacion.risk_band), fontWeight: 600 }}>
                                    {formatRiskScore(cotizacion.risk_score)}
                                </span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(Number(cotizacion.risk_score) * 100, 100)}%`,
                                    background: getRiskBandColor(cotizacion.risk_band),
                                    borderRadius: '4px',
                                    transition: 'width 0.4s ease',
                                }} />
                            </div>
                        </div>
                    ) : null}

                    {/* Desglose de tasa del modelo */}
                    <MlRateBreakdownSection payload={resolveVehiclePayload(cotizacion.ml_response_payload)} />

                    {/* Factores explicativos */}
                    <MlExplainabilitySection payload={resolveVehiclePayload(cotizacion.ml_response_payload)} />

                    {/* Trazabilidad */}
                    <MlTrazabilidadSection payload={resolveVehiclePayload(cotizacion.ml_response_payload)} cotizacion={cotizacion} />
                </div>

                {cotizacion.manual_override_reason ? (
                    <div className="form-section">
                        <h3>Ajuste Manual</h3>
                        <div className="form-field">
                            <strong>Motivo:</strong> {cotizacion.manual_override_reason}
                        </div>
                    </div>
                ) : null}

                {cotizacion.rejection_reason ? (
                    <div className="form-section">
                        <h3>Motivo de Rechazo</h3>
                        <div className="form-field" style={{ color: '#dc2626' }}>
                            {cotizacion.rejection_reason}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '640px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Detalles de la Cotización #{cotizacionId}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <div className="modal-body-scroll" style={{ padding: '0 24px 24px' }}>
                    {renderContent()}
                </div>

                <div className="modal-actions-fixed">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}