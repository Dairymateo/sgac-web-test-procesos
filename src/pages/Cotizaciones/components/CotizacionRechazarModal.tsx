/// <summary>
/// Componente CotizacionRechazarModal.tsx
/// </summary>
import React, { useState, useEffect } from 'react';
import { rejectCotizacion } from '../../../services/cotizaciones.service';
import ModalCloseButton from '../../../components/common/ModalCloseButton';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
    readonly cotizacionId: number | null;
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

export default function CotizacionRechazarModal({ isOpen, onClose, onSuccess, cotizacionId }: Props) {
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError(null);
            setFieldErrors({});
            setIsSaving(false);
        }
    }, [isOpen]);

    if (!isOpen || cotizacionId === null) return null;

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!reason || reason.trim().length < 5) {
            setError('Debe ingresar un motivo válido (mínimo 5 caracteres).');
            setFieldErrors({ rejection_reason: 'Campo obligatorio.' });
            return;
        }

        setIsSaving(true);
        setError(null);
        setFieldErrors({});

        try {
            await rejectCotizacion(cotizacionId, {
                rejection_reason: reason.trim()
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            const rawMessage = err?.message || 'Error al rechazar la cotización.';
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
            <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Rechazar Cotización</h2>
                    <ModalCloseButton onClick={onClose} disabled={isSaving} />
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form data-testid="rechazar-form" className="modal-body-scroll" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-section">
                            <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                Indique el motivo por el cual rechaza la cotización #{cotizacionId}.
                            </p>
                            <div className="form-field">
                                <label htmlFor="rejection_reason">Motivo de Rechazo *</label>
                                <textarea
                                    id="rejection_reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={isSaving}
                                    rows={3}
                                    required
                                />
                                {fieldErrors.rejection_reason ? <span className="field-error">{fieldErrors.rejection_reason}</span> : null}
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions-fixed" style={{ padding: '16px 0 0', marginTop: '16px', borderTop: 'none', background: 'transparent' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary btn-primary--danger" disabled={isSaving}>
                            {isSaving ? 'Rechazando...' : 'Rechazar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}