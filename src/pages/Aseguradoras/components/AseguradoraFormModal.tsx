/// <summary>
/// Componente AseguradoraFormModal.tsx
/// </summary>
import './AseguradoraFormModal.css';
import { useState, useEffect } from 'react';
import type { Aseguradora, FormAseguradora } from '../../../types/aseguradora';
import type { WorkshopRead } from '../../../types/taller';
import { createAseguradora, updateAseguradora } from '../../../services/aseguradoras.service';
import { getTalleres } from '../../../services/talleres.service';
import { fetchCountries, fetchStates, fetchCities } from '../../../services/geo.service';
import type { GeoCountry, GeoState, GeoCity } from '../../../services/geo.service';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: () => void;
    readonly editingItem?: Aseguradora | null;
    readonly viewingItem?: Aseguradora | null;
    readonly canMutate: boolean;
}

const EMPTY_FORM: FormAseguradora = {
    registration_date: new Date().toISOString().slice(0, 10),
    name: '',
    document_type: 'RUC',
    document_number: '',
    country: '',
    province: '',
    city: '',
    address: '',
    phone: '',
    account_executive_name: '',
    account_executive_phone: '',
    account_executive_email: '',
    claims_executive_name: '',
    claims_executive_phone: '',
    claims_executive_email: '',
    portfolio_executive_name: '',
    portfolio_executive_phone: '',
    portfolio_executive_email: '',
    is_active: true,
    workshop_ids: [],
};

const ECUADOR_PHONE_RE = /^(09\d{8}|0[2-8]\d{7})$/;
const ECUADOR_PHONE_HINT = 'Numero ecuatoriano invalido. Ej: movil 09XXXXXXXX o fijo 0[2-8]XXXXXXX.';
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validatePhone = (s: string) => {
    if (!s) return 'El telefono es requerido.';
    if (!ECUADOR_PHONE_RE.test(s)) return ECUADOR_PHONE_HINT;
    return '';
};

const validateExecName = (s: string) => {
    if (!s) return 'El nombre del ejecutivo es requerido.';
    if (s.length > 100) return 'Maximo 100 caracteres.';
    return '';
};

const validateExecEmail = (s: string) => {
    if (!s) return 'El email es requerido.';
    if (!EMAIL_RE.test(s)) return 'Email invalido.';
    return '';
};

const VALIDATORS: Record<string, (s: string) => string> = {
    registration_date: (s) => {
        if (!s) return 'La fecha de registro es requerida.';
        if (s > new Date().toISOString().slice(0, 10)) return 'La fecha de registro no puede ser futura.';
        return '';
    },
    name: (s) => {
        if (!s) return 'El nombre es requerido.';
        if (s.length < 3) return 'Minimo 3 caracteres.';
        if (s.length > 50) return 'Maximo 50 caracteres.';
        return '';
    },
    document_number: (s) => {
        if (!s) return 'El numero de documento es requerido.';
        if (!/^\d{13}$/.test(s)) return 'El RUC debe tener exactamente 13 digitos numericos.';
        return '';
    },
    country: (s) => (s ? '' : 'El pais es requerido.'),
    province: (s) => (s ? '' : 'La provincia es requerida.'),
    city: (s) => (s ? '' : 'La ciudad es requerida.'),
    address: (s) => {
        if (!s) return 'La direccion es requerida.';
        if (s.length > 100) return 'Maximo 100 caracteres.';
        return '';
    },
    phone: validatePhone,
    account_executive_phone: validatePhone,
    claims_executive_phone: validatePhone,
    portfolio_executive_phone: validatePhone,
    account_executive_name: validateExecName,
    claims_executive_name: validateExecName,
    portfolio_executive_name: validateExecName,
    account_executive_email: validateExecEmail,
    claims_executive_email: validateExecEmail,
    portfolio_executive_email: validateExecEmail,
};

function validateField(name: string, value: any): string {
    const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    const validator = VALIDATORS[name];
    return validator ? validator(s) : '';
}

function translateApiFieldError(message: string): string {
    const n = message.toLowerCase();
    if (n.includes('future')) return 'La fecha de registro no puede ser futura.';
    if (n.includes('required') || n.includes('blank') || n.includes('null')) return 'Campo requerido.';
    if (n.includes('at least 3')) return 'El nombre debe tener al menos 3 caracteres.';
    if (n.includes('13 numeric') || n.includes('13 digit')) return 'El RUC debe tener exactamente 13 dígitos numéricos.';
    if (n.includes('valid ecuadorian ruc')) return 'Debe ser un RUC ecuatoriano válido.';
    if (n.includes('valid ecuadorian number') || n.includes('ecuadorian phone')) return ECUADOR_PHONE_HINT;
    if (n.includes('valid email')) return 'Ingrese un email válido.';
    if (n.includes('document type') || n.includes('must be ruc')) return 'El tipo de documento debe ser RUC.';
    if (n.includes('document number') && n.includes('already exists')) return 'Ya existe una aseguradora con este RUC.';
    if (n.includes('already exists')) return 'Ya existe una aseguradora con este nombre.';
    if (n.includes('workshop ids') && n.includes('unique')) return 'No se permiten talleres duplicados.';
    if (n.includes('unique')) return 'Ya existe un registro con este valor.';
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
                errors[field] = translateApiFieldError(message);
            }
        }
    }
    return errors;
}

function getTabForError(errors: Record<string, string>): number {
    const executiveFields = [
        'account_executive_name', 'account_executive_phone', 'account_executive_email',
        'claims_executive_name', 'claims_executive_phone', 'claims_executive_email',
        'portfolio_executive_name', 'portfolio_executive_phone', 'portfolio_executive_email',
    ];
    const firstField = Object.keys(errors).find(f => errors[f]);
    if (!firstField) return 0;
    if (executiveFields.includes(firstField)) return 1;
    if (firstField === 'workshop_ids') return 2;
    return 0;
}

function getModalTitle(viewing?: Aseguradora | null, editing?: Aseguradora | null): string {
    if (viewing) return 'Detalles de Aseguradora';
    if (editing) return 'Editar Aseguradora';
    return 'Registrar Aseguradora';
}

function toSafeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function mapAseguradoraToForm(item: Aseguradora): FormAseguradora {
    return {
        ...EMPTY_FORM,
        id: item.id,
        registration_date: toSafeString(item.registration_date),
        name: toSafeString(item.name),
        document_type: toSafeString(item.document_type) || 'RUC',
        document_number: toSafeString(item.document_number),
        country: toSafeString(item.country),
        province: toSafeString(item.province),
        city: toSafeString(item.city),
        address: toSafeString(item.address),
        phone: toSafeString(item.phone),
        account_executive_name: toSafeString(item.account_executive_name),
        account_executive_phone: toSafeString(item.account_executive_phone),
        account_executive_email: toSafeString(item.account_executive_email),
        claims_executive_name: toSafeString(item.claims_executive_name),
        claims_executive_phone: toSafeString(item.claims_executive_phone),
        claims_executive_email: toSafeString(item.claims_executive_email),
        portfolio_executive_name: toSafeString(item.portfolio_executive_name),
        portfolio_executive_phone: toSafeString(item.portfolio_executive_phone),
        portfolio_executive_email: toSafeString(item.portfolio_executive_email),
        is_active: typeof item.is_active === 'boolean' ? item.is_active : true,
        workshop_ids: Array.isArray(item.workshop_ids) ? item.workshop_ids : [],
    };
}

export default function AseguradoraFormModal({ isOpen, onClose, onSaveSuccess, editingItem, viewingItem, canMutate }: Props) {
    const [form, setForm] = useState<FormAseguradora>({ ...EMPTY_FORM });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState(0);

    const [countries, setCountries] = useState<GeoCountry[]>([]);
    const [states, setStates] = useState<GeoState[]>([]);
    const [cities, setCities] = useState<GeoCity[]>([]);

    const [allTalleres, setAllTalleres] = useState<WorkshopRead[]>([]);
    const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');

    const isReadOnly = !!viewingItem || !canMutate;

    useEffect(() => {
        fetchCountries().then(setCountries).catch(() => { });
    }, []);

    useEffect(() => {
        if (isOpen) {
            getTalleres({ is_active: true, page_size: 100 }).then(setAllTalleres).catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        if (form.country) {
            fetchStates(form.country).then(setStates).catch(() => setStates([]));
        } else {
            setStates([]);
        }
    }, [form.country]);

    useEffect(() => {
        if (form.country && form.province) {
            fetchCities(form.country, form.province).then(setCities).catch(() => setCities([]));
        } else {
            setCities([]);
        }
    }, [form.country, form.province]);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setFieldErrors({});
            setActiveTab(0);
            if (editingItem) {
                setForm(mapAseguradoraToForm(editingItem));
            } else if (viewingItem) {
                setForm(mapAseguradoraToForm(viewingItem));
            } else {
                setForm({ ...EMPTY_FORM, registration_date: new Date().toISOString().slice(0, 10) });
            }
        }
    }, [isOpen, editingItem, viewingItem]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const phoneFields = ['phone', 'account_executive_phone', 'claims_executive_phone', 'portfolio_executive_phone'];

        if ((name === 'document_number' || phoneFields.includes(name)) && !/^\d*$/.test(value)) {
            return;
        }

        if (name === 'is_active') {
            setForm(prev => ({ ...prev, is_active: value === 'true' }));
        } else if (name === 'country') {
            setForm(prev => ({ ...prev, country: value, province: '', city: '' }));
        } else if (name === 'province') {
            setForm(prev => ({ ...prev, province: value, city: '' }));
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

    const addWorkshop = () => {
        const id = Number(selectedWorkshopId);
        if (!id || form.workshop_ids.includes(id)) return;
        setForm(prev => ({ ...prev, workshop_ids: [...prev.workshop_ids, id] }));
        setSelectedWorkshopId('');
    };

    const removeWorkshop = (id: number) => {
        setForm(prev => ({ ...prev, workshop_ids: prev.workshop_ids.filter(wid => wid !== id) }));
    };

    const getWorkshopName = (id: number): string => {
        const t = allTalleres.find(t => t.id === id);
        return t ? t.name : 'Taller no disponible';
    };

    const availableTalleres = allTalleres.filter(t => t.is_active !== false && !form.workshop_ids.includes(t.id));

    const performLocalValidation = () => {
        const fieldsToValidate = [
            'registration_date', 'name', 'document_number',
            'country', 'province', 'city', 'address', 'phone',
            'account_executive_name', 'account_executive_phone', 'account_executive_email',
            'claims_executive_name', 'claims_executive_phone', 'claims_executive_email',
            'portfolio_executive_name', 'portfolio_executive_phone', 'portfolio_executive_email',
        ];
        const errors: Record<string, string> = {};
        for (const f of fieldsToValidate) {
            const val = (form as any)[f] ?? '';
            const err = validateField(f, val);
            if (err) errors[f] = err;
        }
        return errors;
    };

    const handleApiError = (err: any) => {
        if (err?.isGlobal) return;
        const rawMessage = err?.message || 'Ocurrio un error al guardar.';
        const apiFieldErrors: Record<string, string> =
            err?.fieldErrors && Object.keys(err.fieldErrors).length > 0
                ? normalizeApiFieldErrors(err.fieldErrors)
                : parseApiFieldErrors(rawMessage);
        if (Object.keys(apiFieldErrors).length > 0) {
            setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
            setError('Por favor, revise los campos marcados en rojo.');
            setActiveTab(getTabForError(apiFieldErrors));
        } else {
            setError(rawMessage);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isReadOnly) { onClose(); return; }

        const errors = performLocalValidation();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Por favor corrija los errores del formulario antes de guardar.');
            setActiveTab(getTabForError(errors));
            return;
        }

        setIsSaving(true);
        setError(null);

        const up = (s: string | undefined) => (s || '').trim().toUpperCase();
        const payload = {
            ...form,
            name: up(form.name),
            document_number: up(form.document_number),
            country: up(form.country),
            province: up(form.province),
            city: up(form.city),
            address: up(form.address),
            account_executive_name: up(form.account_executive_name),
            claims_executive_name: up(form.claims_executive_name),
            portfolio_executive_name: up(form.portfolio_executive_name),
        };

        try {
            if (form.id) {
                await updateAseguradora(form.id, payload);
            } else {
                await createAseguradora(payload);
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            handleApiError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const modalTitle = getModalTitle(viewingItem, editingItem);
    const initialForm = editingItem ? mapAseguradoraToForm(editingItem) : null;
    const hasChanges = !form.id || (initialForm ? isFormDirty(form, initialForm) : true);
    const submitLabel = getSaveButtonLabel(isSaving, !!form.id);

    const tabs = ['Informacion General', 'Ejecutivos', 'Talleres Asociados'];

    const workshopsSummary = viewingItem?.workshops_summary || editingItem?.workshops_summary || [];

    return (
        <div className="modal-overlay">
            <div className="modal-box aseguradora-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{modalTitle}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="modal-tabs">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab}
                            type="button"
                            className={`tab-btn${activeTab === i ? ' active' : ''}`}
                            onClick={() => setActiveTab(i)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form className="modal-body-scroll" onSubmit={handleSubmit} noValidate>
                    {}
                    {activeTab === 0 && (
                        <div className="form-grid" style={{ paddingTop: 16 }}>
                            <div className="form-section">
                                <h3>Datos de la Aseguradora</h3>
                                <div className="grid-2-col">
                                    <div className="form-field span-2">
                                        <label htmlFor="name">Nombre *</label>
                                        <input type="text" id="name" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={50} placeholder="Ej: Seguros Equinoccial" />
                                        <FieldError name="name" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="document_type">Tipo de Documento</label>
                                        <select id="document_type" name="document_type" value={form.document_type} onChange={handleChange} disabled={isReadOnly}>
                                            <option value="RUC">RUC</option>
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="document_number">Numero de Documento *</label>
                                        <input type="text" id="document_number" name="document_number" value={form.document_number} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={13} inputMode="numeric" placeholder="Ej: 1791288967001" />
                                        <FieldError name="document_number" errors={fieldErrors} />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="phone">Telefono *</label>
                                        <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 022345678" />
                                        <FieldError name="phone" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Ubicacion</h3>
                                <div className="grid-3-col">
                                    <div className="form-field">
                                        <label htmlFor="country">Pais *</label>
                                        <select id="country" name="country" value={form.country} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required>
                                            <option value="">Seleccione...</option>
                                            {countries.map(c => (
                                                <option key={c.iso2} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        <FieldError name="country" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="province">Provincia / Estado *</label>
                                        <select id="province" name="province" value={form.province} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly || !form.country} required>
                                            <option value="">Seleccione...</option>
                                            {states.map(s => (
                                                <option key={s.state_code} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                        <FieldError name="province" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="city">Ciudad *</label>
                                        <select id="city" name="city" value={form.city} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly || !form.province} required>
                                            <option value="">Seleccione...</option>
                                            {cities.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        <FieldError name="city" errors={fieldErrors} />
                                    </div>
                                </div>
                                <div className="grid-2-col" style={{ marginTop: 16 }}>
                                    <div className="form-field span-2">
                                        <label htmlFor="address">Direccion *</label>
                                        <input type="text" id="address" name="address" value={form.address} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Av. Naciones Unidas E3-21 y Av. Amazonas" />
                                        <FieldError name="address" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="grid-2-col">
                                    <div className="form-field">
                                        <label htmlFor="is_active">Estado del Registro</label>
                                        <select id="is_active" name="is_active" value={form.is_active ? 'true' : 'false'} onChange={handleChange} disabled={isReadOnly}>
                                            <option value="true">Activo</option>
                                            <option value="false">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {}
                    {activeTab === 1 && (
                        <div className="form-grid" style={{ paddingTop: 16 }}>
                            <div className="form-section">
                                <h3>Ejecutivo de Cuenta</h3>
                                <div className="grid-3-col">
                                    <div className="form-field">
                                        <label htmlFor="account_executive_name">Nombre *</label>
                                        <input type="text" id="account_executive_name" name="account_executive_name" value={form.account_executive_name} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Maria Fernandez" />
                                        <FieldError name="account_executive_name" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="account_executive_phone">Telefono *</label>
                                        <input type="tel" id="account_executive_phone" name="account_executive_phone" value={form.account_executive_phone} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 0991234567" />
                                        <FieldError name="account_executive_phone" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="account_executive_email">Email *</label>
                                        <input id="account_executive_email" name="account_executive_email" type="email" value={form.account_executive_email} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: contacto@aseguradora.com" />
                                        <FieldError name="account_executive_email" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Ejecutivo de Siniestros</h3>
                                <div className="grid-3-col">
                                    <div className="form-field">
                                        <label htmlFor="claims_executive_name">Nombre *</label>
                                        <input type="text" id="claims_executive_name" name="claims_executive_name" value={form.claims_executive_name} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Carlos Ruiz" />
                                        <FieldError name="claims_executive_name" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="claims_executive_phone">Telefono *</label>
                                        <input type="tel" id="claims_executive_phone" name="claims_executive_phone" value={form.claims_executive_phone} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 0981234567" />
                                        <FieldError name="claims_executive_phone" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="claims_executive_email">Email *</label>
                                        <input id="claims_executive_email" name="claims_executive_email" type="email" value={form.claims_executive_email} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: siniestros@aseguradora.com" />
                                        <FieldError name="claims_executive_email" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Ejecutivo de Cartera</h3>
                                <div className="grid-3-col">
                                    <div className="form-field">
                                        <label htmlFor="portfolio_executive_name">Nombre *</label>
                                        <input type="text" id="portfolio_executive_name" name="portfolio_executive_name" value={form.portfolio_executive_name} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: Ana Torres" />
                                        <FieldError name="portfolio_executive_name" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="portfolio_executive_phone">Telefono *</label>
                                        <input type="tel" id="portfolio_executive_phone" name="portfolio_executive_phone" value={form.portfolio_executive_phone} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={10} placeholder="Ej: 0971234567" />
                                        <FieldError name="portfolio_executive_phone" errors={fieldErrors} />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="portfolio_executive_email">Email *</label>
                                        <input id="portfolio_executive_email" name="portfolio_executive_email" type="email" value={form.portfolio_executive_email} onChange={handleChange} onBlur={handleBlur} disabled={isReadOnly} required maxLength={100} placeholder="Ej: cartera@aseguradora.com" />
                                        <FieldError name="portfolio_executive_email" errors={fieldErrors} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {}
                    {activeTab === 2 && (
                        <div className="form-grid" style={{ paddingTop: 16 }}>
                            <div className="form-section">
                                <h3>Talleres Vinculados</h3>

                                {!isReadOnly && (
                                    <div className="workshop-selector">
                                        <select
                                            value={selectedWorkshopId}
                                            onChange={(e) => setSelectedWorkshopId(e.target.value)}
                                        >
                                            <option value="">Seleccione un taller...</option>
                                            {availableTalleres.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.ruc || 'Sin RUC'})</option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn-add-workshop" onClick={addWorkshop} disabled={!selectedWorkshopId}>
                                            + Agregar
                                        </button>
                                    </div>
                                )}

                                <div className="workshop-chips" style={{ marginTop: 16 }}>
                                    {form.workshop_ids.length === 0 ? (
                                        <span style={{ color: '#94a3b8', fontSize: 14 }}>No hay talleres vinculados.</span>
                                    ) : (
                                        form.workshop_ids.map(wid => {
                                            const summary = workshopsSummary.find(ws => ws.id === wid);
                                            const name = summary ? summary.name : getWorkshopName(wid);
                                            const isActive = summary ? summary.is_active : true;
                                            return (
                                                <span key={wid} className={`workshop-chip${isActive ? '' : ' workshop-chip--inactive'}`}>
                                                    {name}
                                                    {!isReadOnly && (
                                                        <button type="button" onClick={() => removeWorkshop(wid)} aria-label={`Quitar ${name}`}>x</button>
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
                            <button type="submit" className="btn-primary" disabled={isSaving || (!!form.id && !hasChanges)}>
                                {submitLabel}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}