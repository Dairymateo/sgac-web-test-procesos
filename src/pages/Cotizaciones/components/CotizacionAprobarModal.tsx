/// <summary>
/// Componente CotizacionAprobarModal.tsx
/// </summary>
import React, { useState, useEffect } from 'react';
import { approveCotizacion } from '../../../services/cotizaciones.service';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import type { Cotizacion } from '../../../types/cotizacion';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
    readonly cotizacionId: number | null;
}

function translateAprobarError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('this field is required') || lower.includes('may not be blank') || lower.includes('may not be null')) {
        return 'Este campo es obligatorio.';
    }
    if (lower.includes('a valid number is required') || lower.includes('valid number')) {
        return 'Ingrese un valor numérico válido.';
    }
    if (lower.includes('greater than or equal to 0') || lower.includes('ensure this value is greater')) {
        return 'El valor debe ser mayor o igual a 0.';
    }
    if (lower.includes('valid date') || lower.includes('date format')) {
        return 'Ingrese una fecha válida (AAAA-MM-DD).';
    }
    if (lower.includes('not a valid choice')) {
        return 'Seleccione una opción válida.';
    }
    return message;
}

function extractAprobarErrors(err: any): Record<string, string> {
    const errors: Record<string, string> = {};
    const fieldErrors = err?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
        for (const [key, val] of Object.entries(fieldErrors)) {
            const msg = Array.isArray(val) ? String(val[0]) : String(val);
            errors[key] = translateAprobarError(msg);
        }
    }
    return errors;
}

interface ApprovePayloadParams {
    finalPremium: string;
    documentType: string;
    renewalNumber: string;
    affectedDocument: string;
    validFrom: string;
    validUntil: string;
    issueDate: string;
    branch: string;
    paymentMethod: string;
    ivaPercentage: string;
}

function buildApprovePayload({
    finalPremium,
    documentType,
    renewalNumber,
    affectedDocument,
    validFrom,
    validUntil,
    issueDate,
    branch,
    paymentMethod,
    ivaPercentage
}: ApprovePayloadParams): Record<string, string | number> {
    const payload: Record<string, string | number> = { document_type: documentType };
    if (finalPremium.trim()) payload.final_premium = finalPremium.trim();
    if (documentType === 'renewal' && renewalNumber.trim()) payload.renewal_number = Number(renewalNumber);
    if (['endorsement_addition', 'endorsement_inclusion'].includes(documentType) && affectedDocument.trim()) {
        payload.affected_document = affectedDocument.trim().toUpperCase();
    }
    if (validFrom) payload.valid_from = validFrom;
    if (validUntil) payload.valid_until = validUntil;
    if (issueDate) payload.issue_date = issueDate;
    if (branch.trim()) payload.branch = branch.trim();
    if (paymentMethod) payload.payment_method = paymentMethod;
    if (ivaPercentage.trim()) payload.iva_percentage = ivaPercentage.trim();
    return payload;
}

function processAproveApiError(
    err: any,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
    if (err?.isGlobal) return;
    const rawMessage = err?.message || 'Error al aprobar la cotización.';
    const apiErrors = extractAprobarErrors(err);
    if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        setError('Por favor, revise los campos marcados en rojo.');
    } else {
        setError(rawMessage);
    }
}

export default function CotizacionAprobarModal({ isOpen, onClose, onSuccess, cotizacionId }: Props) {
    const [finalPremium, setFinalPremium] = useState('');
    const [documentType, setDocumentType] = useState<'new' | 'renewal' | 'endorsement_addition' | 'endorsement_inclusion'>('new');
    const [renewalNumber, setRenewalNumber] = useState('');
    const [affectedDocument, setAffectedDocument] = useState('');
    const [validFrom, setValidFrom] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [branch, setBranch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'' | 'cash' | 'installments'>('');
    const [ivaPercentage, setIvaPercentage] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [approvedPolicyId, setApprovedPolicyId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFinalPremium('');
            setDocumentType('new');
            setRenewalNumber('');
            setAffectedDocument('');
            setValidFrom('');
            setValidUntil('');
            setIssueDate('');
            setBranch('');
            setPaymentMethod('');
            setIvaPercentage('');
            setError(null);
            setFieldErrors({});
            setIsSaving(false);
            setApprovedPolicyId(null);
        }
    }, [isOpen]);

    if (!isOpen || cotizacionId === null) return null;

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (finalPremium.trim() !== '') {
            const premium = Number(finalPremium);
            if (Number.isNaN(premium) || premium < 0.01) {
                setError('La prima final debe ser un valor mayor o igual a 0.01.');
                setFieldErrors({ final_premium: 'Valor inválido.' });
                return;
            }
        }

        setIsSaving(true);
        setError(null);
        setFieldErrors({});

        const payload = buildApprovePayload({
            finalPremium, documentType, renewalNumber, affectedDocument,
            validFrom, validUntil, issueDate, branch, paymentMethod, ivaPercentage
        });

        try {
            const result: Cotizacion = await approveCotizacion(cotizacionId, payload as any);
            onSuccess();
            if (result.policy_id) {
                setApprovedPolicyId(result.policy_id);
            } else {
                onClose();
            }
        } catch (err: any) {
            processAproveApiError(err, setError, setFieldErrors);
        } finally {
            setIsSaving(false);
        }
    };

    if (approvedPolicyId !== null) {
        return (
            <div className="modal-overlay">
                <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '420px' }}>
                    <div className="modal-header">
                        <h2 className="modal-title">Cotización Aprobada</h2>
                        <ModalCloseButton onClick={onClose} />
                    </div>
                    <div className="modal-body-scroll" style={{ padding: '24px' }}>
                        <p style={{ color: '#16a34a', marginBottom: '12px', fontWeight: 600 }}>
                            La cotización fue aprobada exitosamente.
                        </p>
                        <p style={{ color: '#475569' }}>
                            Se creó la póliza en borrador con ID: <strong>#{approvedPolicyId}</strong>
                        </p>
                    </div>
                    <div className="modal-actions-fixed">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cerrar
                        </button>
                        <a className="btn-primary" href={`/dashboard/polizas?policy=${approvedPolicyId}`}>
                            Ir a poliza
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-box vehiculo-modal-box" style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Aprobar Cotización #{cotizacionId}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form data-testid="aprobar-form" className="modal-body-scroll" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-section">
                            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '0.9rem' }}>
                                Al aprobar se creará la póliza en borrador. Los campos de póliza son opcionales.
                            </p>

                            <div className="form-field">
                                <label htmlFor="final_premium">Prima final</label>
                                <input
                                    id="final_premium"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Si difiere del scoring"
                                    value={finalPremium}
                                    onChange={(e) => setFinalPremium(e.target.value)}
                                    disabled={isSaving}
                                />
                                {fieldErrors.final_premium ? <span className="field-error">{fieldErrors.final_premium}</span> : null}
                            </div>

                            <div className="form-field">
                                <label htmlFor="document_type">Tipo de documento</label>
                                <select
                                    id="document_type"
                                    value={documentType}
                                    onChange={(e) => {
                                        const nextType = e.target.value as typeof documentType;
                                        setDocumentType(nextType);
                                        if (nextType !== 'renewal') setRenewalNumber('');
                                        if (!['endorsement_addition', 'endorsement_inclusion'].includes(nextType)) setAffectedDocument('');
                                    }}
                                    disabled={isSaving}
                                >
                                    <option value="new">Nueva</option>
                                    <option value="renewal">Renovacion</option>
                                    <option value="endorsement_addition">Anexo adicion</option>
                                    <option value="endorsement_inclusion">Anexo inclusion</option>
                                </select>
                                {fieldErrors.document_type ? <span className="field-error">{fieldErrors.document_type}</span> : null}
                            </div>

                            {documentType === 'renewal' && (
                                <div className="form-field">
                                    <label htmlFor="renewal_number">Numero de renovacion</label>
                                    <input
                                        id="renewal_number"
                                        type="number"
                                        min="1"
                                        value={renewalNumber}
                                        onChange={(e) => setRenewalNumber(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.renewal_number ? <span className="field-error">{fieldErrors.renewal_number}</span> : null}
                                </div>
                            )}

                            {['endorsement_addition', 'endorsement_inclusion'].includes(documentType) && (
                                <div className="form-field">
                                    <label htmlFor="affected_document">Documento afectado</label>
                                    <input
                                        id="affected_document"
                                        type="text"
                                        value={affectedDocument}
                                        onChange={(e) => setAffectedDocument(e.target.value.toUpperCase())}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.affected_document ? <span className="field-error">{fieldErrors.affected_document}</span> : null}
                                </div>
                            )}

                            <div className="grid-2-col">
                                <div className="form-field">
                                    <label htmlFor="valid_from">Vigencia desde</label>
                                    <input
                                        id="valid_from"
                                        type="date"
                                        value={validFrom}
                                        onChange={(e) => setValidFrom(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.valid_from ? <span className="field-error">{fieldErrors.valid_from}</span> : null}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="valid_until">Vigencia hasta</label>
                                    <input
                                        id="valid_until"
                                        type="date"
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.valid_until ? <span className="field-error">{fieldErrors.valid_until}</span> : null}
                                </div>
                            </div>

                            <div className="grid-2-col">
                                <div className="form-field">
                                    <label htmlFor="issue_date">Fecha de emisión</label>
                                    <input
                                        id="issue_date"
                                        type="date"
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.issue_date ? <span className="field-error">{fieldErrors.issue_date}</span> : null}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="iva_percentage">IVA (%)</label>
                                    <input
                                        id="iva_percentage"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Ej: 15.00"
                                        value={ivaPercentage}
                                        onChange={(e) => setIvaPercentage(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.iva_percentage ? <span className="field-error">{fieldErrors.iva_percentage}</span> : null}
                                </div>
                            </div>

                            <div className="grid-2-col">
                                <div className="form-field">
                                    <label htmlFor="branch">Sucursal</label>
                                    <input
                                        id="branch"
                                        type="text"
                                        placeholder="Nombre de la sucursal"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    {fieldErrors.branch ? <span className="field-error">{fieldErrors.branch}</span> : null}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="payment_method">Forma de pago</label>
                                    <select
                                        id="payment_method"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as '' | 'cash' | 'installments')}
                                        disabled={isSaving}
                                    >
                                        <option value="">Sin especificar</option>
                                        <option value="cash">Contado</option>
                                        <option value="installments">Cuotas</option>
                                    </select>
                                    {fieldErrors.payment_method ? <span className="field-error">{fieldErrors.payment_method}</span> : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions-fixed" style={{ padding: '16px 0 0', marginTop: '16px', borderTop: 'none', background: 'transparent' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary btn-primary--success" disabled={isSaving}>
                            {isSaving ? 'Aprobando...' : 'Sí, Aprobar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}