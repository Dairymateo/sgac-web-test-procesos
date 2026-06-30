/// <summary>
/// Componente CotizacionAjusteModal.tsx
/// </summary>
import React, { useState, useEffect } from 'react';
import { adjustCotizacion } from '../../../services/cotizaciones.service';
import ModalCloseButton from '../../../components/common/ModalCloseButton';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
    readonly cotizacionId: number | null;
    readonly currentPremium: string | undefined;
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

export default function CotizacionAjusteModal({ isOpen, onClose, onSuccess, cotizacionId, currentPremium }: Props) {
    const [finalPremium, setFinalPremium] = useState('');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setFinalPremium(currentPremium || '');
            setReason('');
            setError(null);
            setFieldErrors({});
            setIsSaving(false);
        }
    }, [isOpen, currentPremium]);

    if (!isOpen || cotizacionId === null) return null;

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!finalPremium || Number.isNaN(Number(finalPremium)) || Number(finalPremium) < 0.01) {
            setError('Debe ingresar un valor numérico válido para la prima.');
            setFieldErrors({ final_premium: 'Debe ser un decimal mayor o igual a 0.01.' });
            return;
        }

        if (!reason || reason.trim().length < 5) {
            setError('Debe ingresar una justificación válida (mínimo 5 caracteres).');
            setFieldErrors({ manual_override_reason: 'Campo obligatorio.' });
            return;
        }

        setIsSaving(true);
        setError(null);
        setFieldErrors({});

        try {
            await adjustCotizacion(cotizacionId, {
                final_premium: finalPremium,
                manual_override_reason: reason.trim()
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            const rawMessage = err?.message || 'Error al aplicar el ajuste.';
            const apiErrors = parseApiFieldErrors(rawMessage);
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

    return (
        <div className="modal-overlay">
            <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Ajuste Manual de Prima</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form data-testid="ajuste-form" className="modal-body-scroll" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-section">
                            <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                Aplicar ajuste a la Cotización #{cotizacionId}. Se requiere una justificación auditable.
                            </p>
                            <div className="form-field">
                                <label htmlFor="final_premium">Prima Final Asegurada ($) *</label>
                                <input
                                    id="final_premium"
                                    type="number"
                                    step="0.01"
                                    value={finalPremium}
                                    onChange={(e) => setFinalPremium(e.target.value)}
                                    disabled={isSaving}
                                    required
                                />
                                {fieldErrors.final_premium ? <span className="field-error">{fieldErrors.final_premium}</span> : null}
                            </div>
                            <div className="form-field">
                                <label htmlFor="reason">Justificación de Ajuste *</label>
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={isSaving}
                                    rows={3}
                                    required
                                />
                                {fieldErrors.manual_override_reason ? <span className="field-error">{fieldErrors.manual_override_reason}</span> : null}
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions-fixed" style={{ padding: '16px 0 0', marginTop: '16px', borderTop: 'none', background: 'transparent' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? 'Aplicando...' : 'Aplicar Ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}