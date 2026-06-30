/// <summary>
/// Componente TallerFormModal.tsx
/// </summary>
import './TallerFormModal.css';
import { useState, useEffect } from 'react';
import type { WorkshopWritePayload, WorkshopRead, Taller } from '../../../types/taller';
import type { Aseguradora } from '../../../types/aseguradora';
import { createTaller, updateTaller } from '../../../services/talleres.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: () => void;
    readonly editingTaller?: WorkshopRead | null;
    readonly viewingTaller?: WorkshopRead | null;
    readonly canMutate: boolean;
}

type FormState = WorkshopWritePayload & { id?: number };
type WorkshopTabKey = 'main' | 'contact' | 'insurers';

const EMPTY_FORM: FormState = {
    name: '',
    ruc: '',
    address: '',
    phone: '',
    contact_executive: '',
    executive_phone: '',
    is_active: true,
    insurer_ids: [],
};

const ECUADOR_PHONE_RE = /^(09\d{8}|0[2-8]\d{7})$/;
const ECUADOR_PHONE_HINT = 'Numero ecuatoriano invalido. Ej: movil 09XXXXXXXX o fijo 0[2-8]XXXXXXX.';

const fieldValidators: Record<string, (text: string) => string> = {
    name: (text) => {
        if (!text) return 'El nombre es requerido.';
        if (text.length < 3) return 'Minimo 3 caracteres.';
        if (text.length > 100) return 'Maximo 100 caracteres.';
        return '';
    },
    ruc: (text) => {
        if (!text) return 'El RUC es requerido.';
        if (!/^\d{13}$/.test(text)) return 'El RUC debe tener exactamente 13 digitos numericos.';
        return '';
    },
    address: (text) => {
        if (!text) return 'La direccion es requerida.';
        if (text.length > 150) return 'Maximo 150 caracteres.';
        return '';
    },
    phone: (text) => {
        if (!text) return 'El telefono es requerido.';
        if (!ECUADOR_PHONE_RE.test(text)) return ECUADOR_PHONE_HINT;
        return '';
    },
    contact_executive: (text) => {
        if (!text) return 'El ejecutivo de contacto es requerido.';
        if (text.length > 100) return 'Maximo 100 caracteres.';
        return '';
    },
    executive_phone: (text) => {
        if (!text) return 'El telefono del ejecutivo es requerido.';
        if (!ECUADOR_PHONE_RE.test(text)) return ECUADOR_PHONE_HINT;
        return '';
    }
};

function validateField(name: string, value: unknown): string {
    const text = (typeof value === 'string' || typeof value === 'number') ? String(value).trim() : '';
    const validator = fieldValidators[name];
    return validator ? validator(text) : '';
}

function translateApiFieldError(message: string): string {
    const n = message.toLowerCase();
    if (n.includes('required') || n.includes('blank') || n.includes('null')) return 'Campo requerido.';
    if (n.includes('at least 3')) return 'El nombre debe tener al menos 3 caracteres.';
    if (n.includes('13 numeric') || n.includes('13 digit')) return 'El RUC debe tener exactamente 13 dígitos numéricos.';
    if (n.includes('valid ecuadorian ruc') || n.includes('valid ruc')) return 'Debe ser un RUC ecuatoriano válido.';
    if (n.includes('valid ecuadorian number') || n.includes('ecuadorian phone')) return ECUADOR_PHONE_HINT;
    if (n.includes('unique')) return 'No se permiten elementos duplicados.';
    if (n.includes('already exists')) return 'Ya existe un registro con este valor.';
    return message;
}

function normalizeApiFieldErrors(fieldErrors?: Record<string, string>): Record<string, string> {
    return Object.entries(fieldErrors ?? {}).reduce<Record<string, string>>((acc, [field, msg]) => {
        if (msg) acc[field] = translateApiFieldError(msg);
        return acc;
    }, {});
}

function parseApiFieldErrors(errorMessage: string): Record<string, string> {
    const errors: Record<string, string> = {};
    const parts = errorMessage.split(';').map(item => item.trim()).filter(Boolean);

    for (const item of parts) {
        const separator = item.indexOf(':');
        if (separator < 0) continue;
        const field = item.slice(0, separator).trim();
        const message = item.slice(separator + 1).trim();
        if (field && message) {
            const isGenericKey = ['detail', 'non_field_errors', 'error', 'message'].includes(field);
            const hasSpace = field.includes(' ');
            if (!isGenericKey && !hasSpace) {
                errors[field] = translateApiFieldError(message);
            }
        }
    }

    return errors;
}

function mapTallerToForm(taller: Taller): FormState {
    return {
        id: taller.id,
        name: taller.name || '',
        ruc: taller.ruc || '',
        address: taller.address || '',
        phone: taller.phone || '',
        contact_executive: taller.contact_executive || '',
        executive_phone: taller.executive_phone || '',
        is_active: typeof taller.is_active === 'boolean' ? taller.is_active : true,
        insurer_ids: Array.isArray(taller.insurer_ids) ? taller.insurer_ids : [],
    };
}

function getModalTitle(viewing?: Taller | null, editing?: Taller | null): string {
    if (viewing) return 'Detalles del Taller';
    if (editing) return 'Editar Taller';
    return 'Registrar Taller';
}

function getTabForError(errors: Record<string, string>): WorkshopTabKey {
    const firstField = Object.keys(errors).find(field => errors[field]);
    if (!firstField) return 'main';
    if (['contact_executive', 'executive_phone', 'is_active'].includes(firstField)) return 'contact';
    if (firstField === 'insurer_ids') return 'insurers';
    return 'main';
}

function buildTallerPayload(form: FormState): WorkshopWritePayload {
    const up = (s: string | undefined) => (s || '').trim().toUpperCase();
    return {
        name: up(form.name),
        ruc: (form.ruc || '').trim(),
        address: up(form.address),
        phone: (form.phone || '').trim(),
        contact_executive: up(form.contact_executive),
        executive_phone: (form.executive_phone || '').trim(),
        is_active: form.is_active ?? true,
        insurer_ids: form.insurer_ids || [],
    };
}

function handleTallerApiError(err: any, setFieldErrors: any, setError: any, setCurrentTab: any) {
    if (err?.isGlobal) return;
    const raw = err?.message || 'Ocurrio un error al guardar.';
    const apiErrors: Record<string, string> =
        err?.fieldErrors && Object.keys(err.fieldErrors).length > 0
            ? normalizeApiFieldErrors(err.fieldErrors)
            : parseApiFieldErrors(raw);
            
    if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        setError('Por favor, revise los campos marcados en rojo.');
        setCurrentTab(getTabForError(apiErrors));
    } else {
        setError(raw);
    }
}

export default function TallerFormModal({ isOpen, onClose, onSaveSuccess, editingTaller, viewingTaller, canMutate }: Props) {
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [currentTab, setCurrentTab] = useState<WorkshopTabKey>('main');

    const [allAseguradoras, setAllAseguradoras] = useState<Aseguradora[]>([]);
    const [selectedInsurerId, setSelectedInsurerId] = useState<string>('');

    const isReadOnly = !!viewingTaller || !canMutate;

    useEffect(() => {
        if (isOpen) {
            getAseguradoras({ is_active: true, page_size: 100 }).then(setAllAseguradoras).catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setFieldErrors({});
        setCurrentTab('main');

        if (editingTaller) {
            setForm(mapTallerToForm(editingTaller));
        } else if (viewingTaller) {
            setForm(mapTallerToForm(viewingTaller));
        } else {
            setForm({ ...EMPTY_FORM });
        }
    }, [isOpen, editingTaller, viewingTaller]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['ruc', 'phone', 'executive_phone'];

        if (numericFields.includes(name) && !/^\d*$/.test(value)) return;

        if (name === 'is_active') {
            setForm(prev => ({ ...prev, is_active: value === 'true' }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }

        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const err = validateField(name, value);
        if (err) setFieldErrors(prev => ({ ...prev, [name]: err }));
    };

    const addInsurer = () => {
        const id = Number(selectedInsurerId);
        if (!id || (form.insurer_ids || []).includes(id)) return;
        setForm(prev => ({ ...prev, insurer_ids: [...(prev.insurer_ids || []), id] }));
        setSelectedInsurerId('');
    };

    const removeInsurer = (id: number) => {
        setForm(prev => ({ ...prev, insurer_ids: (prev.insurer_ids || []).filter(iid => iid !== id) }));
    };

    const getInsurerName = (id: number): string => {
        const insurer = allAseguradoras.find(item => item.id === id);
        return insurer ? insurer.name : 'Aseguradora no disponible';
    };

    const availableAseguradoras = allAseguradoras.filter(a => a.is_active !== false && !(form.insurer_ids || []).includes(a.id));
    const insurersSummary = viewingTaller?.insurers_summary || editingTaller?.insurers_summary || [];

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (isReadOnly) { onClose(); return; }

        const fieldsToValidate = ['name', 'ruc', 'address', 'phone', 'contact_executive', 'executive_phone'];
        const errors: Record<string, string> = {};
        for (const field of fieldsToValidate) {
            const err = validateField(field, (form as any)[field]);
            if (err) errors[field] = err;
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Por favor corrija los errores del formulario antes de guardar.');
            setCurrentTab(getTabForError(errors));
            return;
        }

        const payload = buildTallerPayload(form);

        setIsSaving(true);
        setError(null);

        try {
            if (form.id) {
                await updateTaller(form.id, payload);
            } else {
                await createTaller(payload);
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            handleTallerApiError(err, setFieldErrors, setError, setCurrentTab);
        } finally {
            setIsSaving(false);
        }
    };

    const modalTitle = getModalTitle(viewingTaller, editingTaller);
    const initialForm = editingTaller ? mapTallerToForm(editingTaller) : null;
    const hasChanges = !form.id || (initialForm ? isFormDirty(form, initialForm) : true);
    const submitLabel = getSaveButtonLabel(isSaving, !!form.id);

    return (
        <div className="modal-overlay">
            <div className="modal-box taller-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{modalTitle}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && <div className="action-error" style={{ margin: '16px 24px' }}>{error}</div>}

                <div className="modal-tabs">
                    <button type="button" className={`tab-btn ${currentTab === 'main' ? 'active' : ''}`} onClick={() => setCurrentTab('main')}>
                        Informacion Principal
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'contact' ? 'active' : ''}`} onClick={() => setCurrentTab('contact')}>
                        Contacto y Estado
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'insurers' ? 'active' : ''}`} onClick={() => setCurrentTab('insurers')}>
                        Aseguradoras
                    </button>
                </div>

                <form className="modal-body-scroll" onSubmit={handleSubmit}>
                    {currentTab === 'main' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Informacion Principal</h3>
                                <div className="grid-2-col">
                                <div className="form-field span-2">
                                    <label htmlFor="name">Nombre de Taller *</label>
                                    <input type="text" id="name" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Taller Automotriz Norte" />
                                    <FieldError name="name" errors={fieldErrors} />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="ruc">RUC *</label>
                                    <input type="text" id="ruc" name="ruc" value={form.ruc || ''} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={13} inputMode="numeric" placeholder="Ej: 1792146739001" />
                                    <FieldError name="ruc" errors={fieldErrors} />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="phone">Telefono Oficina *</label>
                                    <input type="tel" id="phone" name="phone" value={form.phone || ''} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 022345678" />
                                    <FieldError name="phone" errors={fieldErrors} />
                                </div>
                                <div className="form-field span-2">
                                    <label htmlFor="address">Direccion *</label>
                                    <input type="text" id="address" name="address" value={form.address || ''} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={150} placeholder="Ej: Av. Amazonas N123 y Naciones Unidas" />
                                    <FieldError name="address" errors={fieldErrors} />
                                </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'contact' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Contacto y Estado</h3>
                                <div className="grid-2-col">
                                <div className="form-field">
                                    <label htmlFor="contact_executive">Ejecutivo de Contacto *</label>
                                    <input type="text" id="contact_executive" name="contact_executive" value={form.contact_executive || ''} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Juan Perez" />
                                    <FieldError name="contact_executive" errors={fieldErrors} />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="executive_phone">Telefono del Ejecutivo *</label>
                                    <input type="tel" id="executive_phone" name="executive_phone" value={form.executive_phone || ''} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 0991234567" />
                                    <FieldError name="executive_phone" errors={fieldErrors} />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="is_active">Estado del Registro</label>
                                    <select id="is_active" name="is_active" value={form.is_active ? 'true' : 'false'} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly}>
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentTab === 'insurers' && (
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Aseguradoras Vinculadas</h3>

                                {!isReadOnly && (
                                    <div className="workshop-selector" style={{ marginBottom: 12 }}>
                                    <select value={selectedInsurerId} onChange={(e) => setSelectedInsurerId(e.target.value)}>
                                        <option value="">Seleccione una aseguradora...</option>
                                        {availableAseguradoras.map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.insurer_code})</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn-add-workshop" onClick={addInsurer} disabled={!selectedInsurerId}>+ Agregar</button>
                                    </div>
                                )}

                                <div className="workshop-chips">
                                {(form.insurer_ids || []).length === 0 ? (
                                    <span style={{ color: '#94a3b8', fontSize: 14 }}>No hay aseguradoras vinculadas.</span>
                                ) : (
                                    (form.insurer_ids || []).map(iid => {
                                        const summary = insurersSummary.find(is => is.id === iid);
                                        const insurerName = summary ? summary.name : getInsurerName(iid);
                                        const isActive = summary ? summary.is_active : true;
                                        return (
                                            <span key={iid} className={`workshop-chip${isActive ? '' : ' workshop-chip--inactive'}`}>
                                                {insurerName}
                                                {!isReadOnly && (
                                                    <button type="button" onClick={() => removeInsurer(iid)} aria-label={`Quitar ${insurerName}`}>x</button>
                                                )}
                                            </span>
                                        );
                                    })
                                )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions-fixed">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button type="submit" className="btn-primary" disabled={isSaving || (!!form.id && !hasChanges)}>{submitLabel}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}