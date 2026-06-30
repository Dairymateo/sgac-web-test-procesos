/// <summary>
/// Componente ClienteFormModal.tsx
/// </summary>
import './ClienteFormModal.css';
import { useEffect, useMemo, useState } from 'react';
import type { Cliente, FormCliente } from '../../../types/cliente';
import { createCliente, getCustomerDocumentUrl, updateCliente } from '../../../services/clientes.service';
import { fetchCities, fetchCountries, fetchStates } from '../../../services/geo.service';
import type { GeoCity, GeoCountry, GeoState } from '../../../services/geo.service';
import { validateCustomerForm } from '../../../utils/customer.validation';
import { FILE_FIELD_MAP } from '../../../mappers/customer.mapper';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface ClienteFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: () => void;
    readonly editingCliente?: Cliente | null;
    readonly viewingCliente?: Cliente | null;
    readonly canMutate: boolean;
}

type FileKey =
    | 'doc_cedula_asegurado'
    | 'doc_cedula_gerente'
    | 'doc_cedula_conyuge'
    | 'doc_planilla_servicio_basico'
    | 'doc_escritura_constitucion'
    | 'doc_nomina_accionistas'
    | 'doc_certificado_cumplimiento'
    | 'doc_declaracion_renta';

type CustomerTabKey = 'general' | 'location' | 'documents';

const EMPTY_FORM: FormCliente = {
    person_type: 'individual',
    first_names: '',
    last_names: '',
    document_type: 'CC',
    document_number: '',
    birth_date: '',
    sex: 'male',
    marital_status: 'single',
    occupation: 'private',
    birth_country: '',
    birth_province: '',
    birth_city: '',
    residence_country: '',
    residence_province: '',
    residence_city: '',
    address: '',
    phone_1: '',
    phone_2: '',
    email: '',
    email_2: '',
    manager_document_number: '',
    spouse_document_number: '',
    registration_date: '',
};

const LEGAL_FILES: FileKey[] = [
    'doc_cedula_gerente',
    'doc_planilla_servicio_basico',
    'doc_escritura_constitucion',
    'doc_nomina_accionistas',
    'doc_certificado_cumplimiento',
    'doc_declaracion_renta',
];

const INDIVIDUAL_FILES: FileKey[] = ['doc_cedula_asegurado', 'doc_planilla_servicio_basico'];

function getModalTitle(viewingCliente?: Cliente | null, editingCliente?: Cliente | null): string {
    if (viewingCliente) return 'Detalles del Cliente';
    if (editingCliente) return 'Editar Cliente';
    return 'Nuevo Cliente';
}

const BACKEND_TO_FORM_FIELD: Record<string, string> = Object.entries(FILE_FIELD_MAP).reduce(
    (acc, [formField, backendField]) => ({ ...acc, [backendField]: formField }),
    {},
);

const FIELD_ERROR_FALLBACKS: Record<string, string> = {
    person_type: 'Selecciona el tipo de persona.',
    first_names: 'Ingresa los nombres del cliente.',
    last_names: 'Ingresa los apellidos del cliente.',
    document_type: 'Selecciona un tipo de documento valido.',
    document_number: 'Ingresa un numero de documento valido.',
    birth_date: 'Ingresa una fecha de nacimiento valida.',
    sex: 'Selecciona el sexo del cliente.',
    marital_status: 'Selecciona el estado civil del cliente.',
    occupation: 'Selecciona la ocupacion del cliente.',
    birth_country: 'Selecciona el pais de nacimiento.',
    birth_province: 'Selecciona la provincia de nacimiento.',
    birth_city: 'Selecciona la ciudad de nacimiento.',
    residence_country: 'Selecciona el pais de residencia.',
    residence_province: 'Selecciona la provincia de residencia.',
    residence_city: 'Selecciona la ciudad de residencia.',
    address: 'Ingresa la direccion del cliente.',
    phone_1: 'Ingresa un telefono principal valido.',
    phone_2: 'Ingresa un telefono secundario valido.',
    email: 'Ingresa un correo valido.',
    email_2: 'Ingresa un correo secundario valido.',
    manager_document_number: 'Ingresa una cedula valida del gerente.',
    spouse_document_number: 'Ingresa una cedula valida del conyuge.',
    doc_cedula_asegurado: 'Adjunta la cedula del asegurado.',
    doc_cedula_gerente: 'Adjunta la cedula del gerente.',
    doc_cedula_conyuge: 'Adjunta la cedula del conyuge.',
    doc_planilla_servicio_basico: 'Adjunta la planilla de servicio basico.',
    doc_escritura_constitucion: 'Adjunta la escritura de constitucion.',
    doc_nomina_accionistas: 'Adjunta la nomina de accionistas.',
    doc_certificado_cumplimiento: 'Adjunta el certificado de cumplimiento.',
    doc_declaracion_renta: 'Adjunta la declaracion de renta.',
};

const API_ERROR_RULES: Array<{ test: (n: string) => boolean; msg: string | ((f: string) => string) }> = [
    {
        test: (n) => n.includes('valid ecuadorian cedula'),
        msg: (f) => {
            if (f === 'spouse_document_number') return 'La cedula del conyuge no es valida.';
            if (f === 'manager_document_number') return 'La cedula del gerente no es valida.';
            return 'La cedula ecuatoriana no es valida.';
        }
    },
    { test: (n) => n.includes('valid ecuadorian ruc'), msg: 'El RUC ecuatoriano no es valido.' },
    { test: (n) => n.includes('alphanumeric') && n.includes('document_type pas'), msg: 'El pasaporte debe tener entre 6 y 20 letras o numeros.' },
    { test: (n) => n.includes('at least 18'), msg: 'El cliente debe tener al menos 18 años.' },
    { test: (n) => n.includes('future'), msg: 'La fecha no puede ser futura.' },
    { test: (n) => n.includes('yyyy-mm-dd') || n.includes('iso'), msg: 'La fecha debe estar en formato YYYY-MM-DD.' },
    { test: (n) => n.includes('10 digits') || n.includes('10 digitos'), msg: 'Debe tener exactamente 10 digitos.' },
    { test: (n) => n.includes('required') || n.includes('blank') || n.includes('empty'), msg: (f) => FIELD_ERROR_FALLBACKS[f] ?? 'Completa este campo.' },
    { test: (n) => n.includes('valid email'), msg: 'Ingresa un correo valido.' },
    { test: (n) => n.includes('must match') || n.includes('coincidir'), msg: 'El RUC debe coincidir con el numero de documento.' },
    { test: (n) => n.includes('file') && n.includes('5'), msg: 'El archivo no debe superar los 5 MB.' },
    { test: (n) => n.includes('pdf') || n.includes('jpg') || n.includes('jpeg') || n.includes('png') || n.includes('mime'), msg: 'Adjunta un archivo PDF, JPG o PNG.' },
    { test: (n) => n.includes('document_type') && n.includes('ruc'), msg: 'Para persona juridica el tipo de documento debe ser RUC.' }
];

function translateApiFieldError(field: string, message: string): string {
    const normalized = message.toLowerCase();
    for (const rule of API_ERROR_RULES) {
        if (rule.test(normalized)) {
            return typeof rule.msg === 'function' ? rule.msg(field) : rule.msg;
        }
    }
    return FIELD_ERROR_FALLBACKS[field] ?? 'Revisa el valor ingresado.';
}

function normalizeApiFieldErrors(fieldErrors: Record<string, string> | undefined): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [field, message] of Object.entries(fieldErrors ?? {})) {
        const formField = BACKEND_TO_FORM_FIELD[field] ?? field;
        errors[formField] = translateApiFieldError(formField, message);
    }
    return errors;
}

function getTabForError(errors: Record<string, string>): CustomerTabKey {
    const firstField = Object.keys(errors).find(field => errors[field]);
    if (!firstField) return 'general';

    if (
        [
            'birth_country',
            'birth_province',
            'birth_city',
            'residence_country',
            'residence_province',
            'residence_city',
            'address',
        ].includes(firstField)
    ) {
        return 'location';
    }

    if (firstField.startsWith('doc_')) return 'documents';

    return 'general';
}

const VALIDATION_REGEX: Record<string, RegExp> = {
    first_names: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/,
    last_names: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/,
    phone_1: /^\d*$/,
    phone_2: /^\d*$/,
    manager_document_number: /^\d*$/,
    spouse_document_number: /^\d*$/,
};

function validateFieldInput(name: string, value: string, docType: string): string | null {
    if (name === 'document_number') {
        if (docType === 'PAS') return /^[a-zA-Z0-9]*$/.test(value) ? value.trim().toUpperCase() : null;
        if (!/^\d*$/.test(value)) return null;
        return value;
    }
    const regex = VALIDATION_REGEX[name];
    if (regex && !regex.test(value)) return null;
    return value;
}

function removeFieldError(name: string, prev: Record<string, string>) {
    if (!prev[name]) return prev;
    const next = { ...prev };
    delete next[name];
    return next;
}

function loadGeoData(
    customer: FormCliente,
    setBirthStates: React.Dispatch<React.SetStateAction<GeoState[]>>,
    setBirthCities: React.Dispatch<React.SetStateAction<GeoCity[]>>,
    setResidenceStates: React.Dispatch<React.SetStateAction<GeoState[]>>,
    setResidenceCities: React.Dispatch<React.SetStateAction<GeoCity[]>>
) {
    if (customer.birth_country) {
        fetchStates(customer.birth_country).then(setBirthStates).catch(() => undefined);
        if (customer.birth_province) fetchCities(customer.birth_country, customer.birth_province).then(setBirthCities).catch(() => undefined);
    }
    if (customer.residence_country) {
        fetchStates(customer.residence_country).then(setResidenceStates).catch(() => undefined);
        if (customer.residence_province) fetchCities(customer.residence_country, customer.residence_province).then(setResidenceCities).catch(() => undefined);
    }
}

function processGeoChange(
    name: string,
    value: string,
    formCountry: string,
    setForm: React.Dispatch<React.SetStateAction<FormCliente>>,
    setStates: React.Dispatch<React.SetStateAction<GeoState[]>>,
    setCities: React.Dispatch<React.SetStateAction<GeoCity[]>>
) {
    if (name === 'birth_country' || name === 'residence_country') {
        const isBirth = name === 'birth_country';
        setForm((prev) => ({
            ...prev,
            [name]: value,
            [isBirth ? 'birth_province' : 'residence_province']: '',
            [isBirth ? 'birth_city' : 'residence_city']: ''
        }));
        setStates([]);
        setCities([]);
        if (value) fetchStates(value).then(setStates).catch(() => undefined);
    } else if (name === 'birth_province' || name === 'residence_province') {
        const isBirth = name === 'birth_province';
        setForm((prev) => ({ ...prev, [name]: value, [isBirth ? 'birth_city' : 'residence_city']: '' }));
        setCities([]);
        if (value) fetchCities(formCountry, value).then(setCities).catch(() => undefined);
    }
}

function processApiError(
    err: any,
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setRequestId: React.Dispatch<React.SetStateAction<string | null>>,
    setCurrentTab: React.Dispatch<React.SetStateAction<CustomerTabKey>>
) {
    if (err?.isGlobal) return;
    const apiFieldErrors = normalizeApiFieldErrors(err?.fieldErrors);
    if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        setError('Revisa los campos marcados antes de guardar.');
        setRequestId(err?.requestId ?? null);
        setCurrentTab(getTabForError(apiFieldErrors));
    } else {
        setError(err?.message || 'Error al guardar cliente.');
        setRequestId(err?.requestId ?? null);
    }
}

interface ProcessFieldChangeParams {
    name: string;
    value: string;
    form: FormCliente;
    setForm: React.Dispatch<React.SetStateAction<FormCliente>>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
    setBirthStates: React.Dispatch<React.SetStateAction<GeoState[]>>;
    setBirthCities: React.Dispatch<React.SetStateAction<GeoCity[]>>;
    setResidenceStates: React.Dispatch<React.SetStateAction<GeoState[]>>;
    setResidenceCities: React.Dispatch<React.SetStateAction<GeoCity[]>>;
}

function processFieldChange({
    name,
    value,
    form,
    setForm,
    setFieldErrors,
    setFiles,
    setBirthStates,
    setBirthCities,
    setResidenceStates,
    setResidenceCities
}: ProcessFieldChangeParams) {
    setFieldErrors((prev) => removeFieldError(name, prev));

    const validValue = validateFieldInput(name, value, form.document_type);
    if (validValue === null) return;

    if (name === 'person_type') {
        const isLegal = validValue === 'legal_entity';
        setForm((prev) => {
            let nextDocType = prev.document_type;
            if (isLegal) nextDocType = 'RUC';
            else if (prev.document_type === 'RUC') nextDocType = 'CC';

            return {
                ...prev,
                person_type: validValue as FormCliente['person_type'],
                document_type: nextDocType,
                birth_date: isLegal ? '' : prev.birth_date,
                birth_country: isLegal ? '' : prev.birth_country,
                birth_province: isLegal ? '' : prev.birth_province,
                birth_city: isLegal ? '' : prev.birth_city,
                marital_status: isLegal ? 'single' : prev.marital_status,
                spouse_document_number: isLegal ? '' : prev.spouse_document_number,
                manager_document_number: isLegal ? prev.manager_document_number : '',
            };
        });
        return;
    }

    if (name === 'marital_status') {
        setForm((prev) => ({
            ...prev,
            marital_status: validValue as FormCliente['marital_status'],
            spouse_document_number: (validValue === 'married' || validValue === 'common_law') ? prev.spouse_document_number : '',
        }));
        if (validValue !== 'married' && validValue !== 'common_law') {
            setFiles((prev) => {
                const next = { ...prev };
                delete next.doc_cedula_conyuge;
                return next;
            });
        }
        return;
    }

    const geoFields = ['birth_country', 'birth_province', 'residence_country', 'residence_province'];
    if (geoFields.includes(name)) {
        const isBirth = name.startsWith('birth');
        processGeoChange(
            name,
            validValue,
            isBirth ? form.birth_country : form.residence_country,
            setForm,
            isBirth ? setBirthStates : setResidenceStates,
            isBirth ? setBirthCities : setResidenceCities
        );
        return;
    }

    setForm((prev) => ({ ...prev, [name]: validValue }));
}

interface TabProps {
    form: FormCliente;
    fieldErrors: Record<string, string>;
    isReadOnly: boolean;
    isLegalEntity: boolean;
    isConjugalStatus: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function ErrorMessage({ message }: Readonly<{ message?: string }>) {
    if (!message) return null;
    return <span className="field-error">{message}</span>;
}

function GeneralDataTab({ form, fieldErrors, isReadOnly, isLegalEntity, isConjugalStatus, handleChange }: Readonly<TabProps>) {
    let docLabel = isLegalEntity ? 'Numero de RUC *' : 'Numero de Documento *';
    let docMaxLen = 10;
    let docPlaceholder = 'Ej: 1712345678';

    if (form.document_type === 'PAS') {
        docMaxLen = 20;
        docPlaceholder = 'Ej: AB123456';
    } else if (form.document_type === 'RUC') {
        docMaxLen = 13;
        docPlaceholder = 'Ej: 1791234567001';
    }

    return (
        <div className="form-grid">
            <div className="form-section">
                <h3>Datos Generales</h3>
                <div className="grid-2-col">
                    <div className="form-field">
                        <label htmlFor="person_type">Tipo de Persona</label>
                        <select id="person_type" name="person_type" value={form.person_type} onChange={handleChange} disabled={isReadOnly}>
                            <option value="individual">Natural</option>
                            <option value="legal_entity">Juridica</option>
                        </select>
                    </div>
                    <div className="form-field">
                        <label htmlFor="document_type">Tipo de Documento *</label>
                        <select id="document_type" name="document_type" value={form.document_type} onChange={handleChange} disabled={isReadOnly || isLegalEntity} required>
                            {!isLegalEntity && <option value="CC">Cedula</option>}
                            {!isLegalEntity && <option value="PAS">Pasaporte</option>}
                            {isLegalEntity && <option value="RUC">RUC</option>}
                        </select>
                        <ErrorMessage message={fieldErrors.document_type} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="document_number">{docLabel}</label>
                        <input id="document_number" type="text" name="document_number" value={form.document_number} onChange={handleChange} disabled={isReadOnly} required maxLength={docMaxLen} placeholder={docPlaceholder} />
                        <ErrorMessage message={fieldErrors.document_number} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="first_names">Nombres *</label>
                        <input id="first_names" type="text" name="first_names" value={form.first_names} onChange={handleChange} disabled={isReadOnly} required placeholder="Ej: Juan Carlos" />
                        <ErrorMessage message={fieldErrors.first_names} />
                    </div>
                    {!isLegalEntity && (
                        <div className="form-field">
                            <label htmlFor="last_names">Apellidos *</label>
                            <input id="last_names" type="text" name="last_names" value={form.last_names} onChange={handleChange} disabled={isReadOnly} required placeholder="Ej: Perez Lopez" />
                            <ErrorMessage message={fieldErrors.last_names} />
                        </div>
                    )}
                    {isLegalEntity && (
                        <div className="form-field">
                            <label htmlFor="manager_document_number">Identificación Gerente *</label>
                            <input id="manager_document_number" type="text" name="manager_document_number" value={form.manager_document_number || ''} onChange={handleChange} disabled={isReadOnly} required placeholder="Ej: 1712345678" />
                            <ErrorMessage message={fieldErrors.manager_document_number} />
                        </div>
                    )}
                    {!isLegalEntity && (
                        <>
                            <div className="form-field">
                                <label htmlFor="birth_date">Fecha de Nacimiento *</label>
                                <input id="birth_date" type="date" name="birth_date" value={form.birth_date || ''} onChange={handleChange} disabled={isReadOnly} required />
                                <ErrorMessage message={fieldErrors.birth_date} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="sex">Sexo *</label>
                                <select id="sex" name="sex" value={form.sex} onChange={handleChange} disabled={isReadOnly} required>
                                    <option value="male">Masculino</option>
                                    <option value="female">Femenino</option>
                                    <option value="other">Otro</option>
                                </select>
                                <ErrorMessage message={fieldErrors.sex} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="marital_status">Estado Civil *</label>
                                <select id="marital_status" name="marital_status" value={form.marital_status} onChange={handleChange} disabled={isReadOnly} required>
                                    <option value="single">Soltero</option>
                                    <option value="married">Casado</option>
                                    <option value="divorced">Divorciado</option>
                                    <option value="widowed">Viudo</option>
                                    <option value="common_law">Union libre</option>
                                </select>
                                <ErrorMessage message={fieldErrors.marital_status} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="occupation">Ocupacion *</label>
                                <select id="occupation" name="occupation" value={form.occupation} onChange={handleChange} disabled={isReadOnly} required>
                                    <option value="private">Privado</option>
                                    <option value="public">Publico</option>
                                </select>
                                <ErrorMessage message={fieldErrors.occupation} />
                            </div>
                            {isConjugalStatus && (
                                <div className="form-field">
                                    <label htmlFor="spouse_document_number">Documento Conyuge *</label>
                                    <input id="spouse_document_number" type="text" name="spouse_document_number" value={form.spouse_document_number || ''} onChange={handleChange} disabled={isReadOnly} placeholder="Ej: 1712345678" />
                                    <ErrorMessage message={fieldErrors.spouse_document_number} />
                                </div>
                            )}
                        </>
                    )}
                    <div className="form-field">
                        <label htmlFor="phone_1">Telefono Principal *</label>
                        <input id="phone_1" type="text" name="phone_1" maxLength={10} value={form.phone_1} onChange={handleChange} disabled={isReadOnly} required placeholder="Ej: 0991234567" />
                        <ErrorMessage message={fieldErrors.phone_1} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="phone_2">Telefono Secundario</label>
                        <input id="phone_2" type="text" name="phone_2" maxLength={10} value={form.phone_2 || ''} onChange={handleChange} disabled={isReadOnly} placeholder="Ej: 022345678" />
                        <ErrorMessage message={fieldErrors.phone_2} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="email">Correo *</label>
                        <input id="email" type="email" name="email" value={form.email} onChange={handleChange} disabled={isReadOnly} required placeholder="Ej: juan.perez@gmail.com" />
                        <ErrorMessage message={fieldErrors.email} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="email_2">Correo Secundario</label>
                        <input id="email_2" type="email" name="email_2" value={form.email_2 || ''} onChange={handleChange} disabled={isReadOnly} placeholder="Ej: j.perez@trabajo.com" />
                        <ErrorMessage message={fieldErrors.email_2} />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface LocationTabProps {
    form: FormCliente;
    fieldErrors: Record<string, string>;
    isReadOnly: boolean;
    isLegalEntity: boolean;
    countries: GeoCountry[];
    birthStates: GeoState[];
    birthCities: GeoCity[];
    residenceStates: GeoState[];
    residenceCities: GeoCity[];
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function LocationTab({
    form,
    fieldErrors,
    isReadOnly,
    isLegalEntity,
    countries,
    birthStates,
    birthCities,
    residenceStates,
    residenceCities,
    handleChange
}: Readonly<LocationTabProps>) {
    let countryLabel = isLegalEntity ? 'País de domicilio *' : 'Pais Residencia *';
    let provinceLabel = isLegalEntity ? 'Provincia de domicilio *' : 'Provincia Residencia *';
    let cityLabel = isLegalEntity ? 'Ciudad de domicilio *' : 'Ciudad Residencia *';
    let addressLabel = isLegalEntity ? 'Dirección matriz/domicilio fiscal *' : 'Direccion *';

    return (
        <div className="form-grid">
            <div className="form-section">
                <h3>Ubicacion</h3>
                <div className="grid-2-col">
                    {!isLegalEntity && (
                        <>
                            <div className="form-field"><label htmlFor="birth_country">Pais Nacimiento *</label><select id="birth_country" name="birth_country" value={form.birth_country} onChange={handleChange} disabled={isReadOnly}><option value="">Seleccione</option>{countries.map((c) => <option key={c.iso2} value={c.name}>{c.name}</option>)}</select><ErrorMessage message={fieldErrors.birth_country} /></div>
                            <div className="form-field"><label htmlFor="birth_province">Provincia Nacimiento *</label><select id="birth_province" name="birth_province" value={form.birth_province} onChange={handleChange} disabled={isReadOnly || !form.birth_country}><option value="">Seleccione</option>{birthStates.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select><ErrorMessage message={fieldErrors.birth_province} /></div>
                            <div className="form-field"><label htmlFor="birth_city">Ciudad Nacimiento *</label><select id="birth_city" name="birth_city" value={form.birth_city} onChange={handleChange} disabled={isReadOnly || !form.birth_province}><option value="">Seleccione</option>{birthCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select><ErrorMessage message={fieldErrors.birth_city} /></div>
                        </>
                    )}
                    <div className="form-field"><label htmlFor="residence_country">{countryLabel}</label><select id="residence_country" name="residence_country" value={form.residence_country} onChange={handleChange} disabled={isReadOnly}><option value="">Seleccione</option>{countries.map((c) => <option key={c.iso2} value={c.name}>{c.name}</option>)}</select><ErrorMessage message={fieldErrors.residence_country} /></div>
                    <div className="form-field"><label htmlFor="residence_province">{provinceLabel}</label><select id="residence_province" name="residence_province" value={form.residence_province} onChange={handleChange} disabled={isReadOnly || !form.residence_country}><option value="">Seleccione</option>{residenceStates.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select><ErrorMessage message={fieldErrors.residence_province} /></div>
                    <div className="form-field"><label htmlFor="residence_city">{cityLabel}</label><select id="residence_city" name="residence_city" value={form.residence_city} onChange={handleChange} disabled={isReadOnly || !form.residence_province}><option value="">Seleccione</option>{residenceCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select><ErrorMessage message={fieldErrors.residence_city} /></div>
                    <div className="form-field span-2"><label htmlFor="address">{addressLabel}</label><input type="text" id="address" name="address" value={form.address} onChange={handleChange} disabled={isReadOnly} placeholder="Ej: Av. Amazonas N23-45 y Patria" /><ErrorMessage message={fieldErrors.address} /></div>
                </div>
            </div>
        </div>
    );
}

export default function ClienteFormModal({
    isOpen,
    onClose,
    onSaveSuccess,
    editingCliente,
    viewingCliente,
    canMutate,
}: ClienteFormModalProps) {
    const [form, setForm] = useState<FormCliente>(EMPTY_FORM);
    const [files, setFiles] = useState<Record<string, File | null>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<CustomerTabKey>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingDocument, setLoadingDocument] = useState<Record<string, boolean>>({});

    const [countries, setCountries] = useState<GeoCountry[]>([]);
    const [birthStates, setBirthStates] = useState<GeoState[]>([]);
    const [birthCities, setBirthCities] = useState<GeoCity[]>([]);
    const [residenceStates, setResidenceStates] = useState<GeoState[]>([]);
    const [residenceCities, setResidenceCities] = useState<GeoCity[]>([]);

    const isReadOnly = Boolean(viewingCliente) || !canMutate;
    const customer = editingCliente || viewingCliente;
    const isLegalEntity = form.person_type === 'legal_entity';
    const isConjugalStatus = form.marital_status === 'married' || form.marital_status === 'common_law';

    const requiredFiles = useMemo(() => (isLegalEntity ? LEGAL_FILES : INDIVIDUAL_FILES), [isLegalEntity]);
    const initialForm = useMemo(() => {
        if (!editingCliente) return null;
        return { ...editingCliente, registration_date: editingCliente.registration_date || '' };
    }, [editingCliente]);
    const hasChanges = !editingCliente?.id
        || (initialForm ? isFormDirty(form, initialForm) : true)
        || Object.keys(files).length > 0;
    const submitLabel = getSaveButtonLabel(isSaving, Boolean(editingCliente?.id));

    useEffect(() => {
        if (!isOpen) return;

        fetchCountries().then(setCountries).catch(() => undefined);
        setCurrentTab('general');
        setFieldErrors({});
        setError(null);
        setRequestId(null);
        setFiles({});

        const targetCustomer = editingCliente || viewingCliente;
        if (targetCustomer) {
            setForm({ ...targetCustomer, registration_date: targetCustomer.registration_date || '' });
            loadGeoData(targetCustomer, setBirthStates, setBirthCities, setResidenceStates, setResidenceCities);
            return;
        }

        setForm({ ...EMPTY_FORM });
        setBirthStates([]);
        setBirthCities([]);
        setResidenceStates([]);
        setResidenceCities([]);
    }, [isOpen, editingCliente, viewingCliente]);

    if (!isOpen) return null;


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        processFieldChange({
            name: e.target.name,
            value: e.target.value,
            form,
            setForm,
            setFieldErrors,
            setFiles,
            setBirthStates,
            setBirthCities,
            setResidenceStates,
            setResidenceCities
        });
    };

    const handleFileChange = (field: FileKey, file: File | null) => {
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });

        if (!file) {
            setFiles((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
            return;
        }
        setFiles((prev) => ({ ...prev, [field]: file }));
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isReadOnly) return;

        const errors = validateCustomerForm(form, files, !form.id);
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError('Revisa los campos marcados antes de guardar.');
            setRequestId(null);
            setCurrentTab(getTabForError(errors));
            return;
        }

        setError(null);
        setRequestId(null);
        setIsSaving(true);

        try {
            const payload = {
                ...form,
                document_type: isLegalEntity ? 'RUC' : form.document_type,
                spouse_document_number: isConjugalStatus ? (form.spouse_document_number || '') : '',
            };
            const filesToSend = { ...files };
            if (!isConjugalStatus) delete filesToSend.doc_cedula_conyuge;
            if (editingCliente?.id) {
                await updateCliente(editingCliente.id, payload, filesToSend);
            } else {
                await createCliente(payload, filesToSend);
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            processApiError(err, setFieldErrors, setError, setRequestId, setCurrentTab);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenExistingDocument = async (field: FileKey) => {
        if (!customer?.id) return;
        const backendField = FILE_FIELD_MAP[field];
        if (!backendField) return;

        setLoadingDocument((prev) => ({ ...prev, [field]: true }));
        try {
            const url = await getCustomerDocumentUrl(customer.id, backendField);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            if (err?.isGlobal) return;
            setError(err?.message || 'No se pudo abrir el documento.');
        } finally {
            setLoadingDocument((prev) => ({ ...prev, [field]: false }));
        }
    };

    const renderFileInput = (field: FileKey, label: string) => {
        const backendField = FILE_FIELD_MAP[field];
        const hasExistingDocument = Boolean(
            customer?.archivos?.[backendField]
        );

        return (
            <div className="form-field" key={field}>
                <label htmlFor={field}>{label}{requiredFiles.includes(field) ? ' *' : ''}</label>
                {hasExistingDocument && (
                    <div style={{ marginBottom: 6 }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleOpenExistingDocument(field)}
                            disabled={Boolean(loadingDocument[field])}
                        >
                            {loadingDocument[field] ? 'Abriendo...' : 'Documento actual: Ver'}
                        </button>
                    </div>
                )}
                <input
                    id={field}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={isReadOnly}
                    onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                />
                {fieldErrors[field] ? <span className="field-error">{fieldErrors[field]}</span> : null}
            </div>
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box cliente-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{getModalTitle(viewingCliente, editingCliente)}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && (
                    <div className="action-error">
                        {error}
                        {requestId ? <small> ID soporte: {requestId}</small> : null}
                    </div>
                )}

                <div className="modal-tabs">
                    <button type="button" className={`tab-btn ${currentTab === 'general' ? 'active' : ''}`} onClick={() => setCurrentTab('general')}>
                        Datos Generales
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'location' ? 'active' : ''}`} onClick={() => setCurrentTab('location')}>
                        Ubicacion
                    </button>
                    <button type="button" className={`tab-btn ${currentTab === 'documents' ? 'active' : ''}`} onClick={() => setCurrentTab('documents')}>
                        Documentos
                    </button>
                </div>

                <form className="modal-body-scroll cliente-form" onSubmit={handleSubmit} noValidate>
                    {currentTab === 'general' && (
                        <GeneralDataTab
                            form={form}
                            fieldErrors={fieldErrors}
                            isReadOnly={isReadOnly}
                            isLegalEntity={isLegalEntity}
                            isConjugalStatus={isConjugalStatus}
                            handleChange={handleChange}
                        />
                    )}

                    {currentTab === 'location' && (
                        <LocationTab
                            form={form}
                            fieldErrors={fieldErrors}
                            isReadOnly={isReadOnly}
                            isLegalEntity={isLegalEntity}
                            countries={countries}
                            birthStates={birthStates}
                            birthCities={birthCities}
                            residenceStates={residenceStates}
                            residenceCities={residenceCities}
                            handleChange={handleChange}
                        />
                    )}

                    {currentTab === 'documents' && (
                        <div className="form-grid">
                            <div className="form-section files-section">
                                <h3>Documentos</h3>
                                <div className="grid-2-col mt-3">
                            {isLegalEntity ? (
                                <>
                                    {renderFileInput('doc_cedula_gerente', 'Cedula Gerente')}
                                    {renderFileInput('doc_planilla_servicio_basico', 'Planilla Servicio Basico')}
                                    {renderFileInput('doc_escritura_constitucion', 'Escritura Constitucion')}
                                    {renderFileInput('doc_nomina_accionistas', 'Nomina Accionistas')}
                                    {renderFileInput('doc_certificado_cumplimiento', 'Certificado Cumplimiento')}
                                    {renderFileInput('doc_declaracion_renta', 'Declaracion Renta')}
                                    {isConjugalStatus && renderFileInput('doc_cedula_conyuge', 'Cedula Conyuge')}
                                </>
                            ) : (
                                <>
                                    {renderFileInput('doc_cedula_asegurado', 'Cedula Asegurado')}
                                    {renderFileInput('doc_planilla_servicio_basico', 'Planilla Servicio Basico')}
                                    {isConjugalStatus && renderFileInput('doc_cedula_conyuge', 'Cedula Conyuge')}
                                </>
                            )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions-fixed">
                        <button type="button" className="btn-secondary" onClick={onClose}>{isReadOnly ? 'Cerrar' : 'Cancelar'}</button>
                        {!isReadOnly && (
                            <button type="submit" className="btn-primary" disabled={isSaving || (Boolean(editingCliente?.id) && !hasChanges)}>{submitLabel}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}