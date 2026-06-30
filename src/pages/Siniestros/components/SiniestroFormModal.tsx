/// <summary>
/// Componente SiniestroFormModal.tsx
/// </summary>
import './SiniestroFormModal.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import type { Claim, ClaimCoverageType, ClaimDamageType, ClaimDocumentWrite, ClaimInsurerDetail, ClaimPaymentType, ClaimStatus, ClaimWritePayload } from '../../../types/siniestro';
import { createSiniestro, partialUpdateSiniestro, getClaimDocumentUrl } from '../../../services/siniestros.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';
import { getTalleres } from '../../../services/talleres.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { getPolicies } from '../../../services/policies.service';
import type { Cliente } from '../../../types/cliente';
import type { Vehiculo } from '../../../types/vehiculo';
import type { Taller } from '../../../types/taller';
import type { Aseguradora } from '../../../types/aseguradora';
import type { Policy } from '../../../types/policy';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface SiniestroFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: (newClaim?: Claim) => void;
    readonly editingSiniestro?: Claim | null;
    readonly viewingSiniestro?: Claim | null;
    readonly canMutate: boolean;
}

type TabKey = 'general' | 'fechas' | 'aseguradora' | 'documentos';

const TODAY = new Date().toISOString().slice(0, 10);

const FUTURE_DATE_FIELDS: Array<keyof ClaimWritePayload> = [
    'claim_date',
    'broker_report_date',
    'insurer_report_date',
    'documentation_date',
    'repair_authorization_date',
    'estimated_departure_date',
    'payment_date',
];

const DATE_FIELD_LABELS: Partial<Record<keyof ClaimWritePayload, string>> = {
    claim_date: 'Fecha del siniestro',
    broker_report_date: 'Fecha reporte broker',
    insurer_report_date: 'Fecha reporte aseguradora',
    documentation_date: 'Fecha documentacion',
    repair_authorization_date: 'Fecha autorizacion reparacion',
    estimated_departure_date: 'Fecha salida estimada',
    payment_date: 'Fecha pago',
};

const EMPTY_FORM: ClaimWritePayload = {
    insured_customer: 0,
    vehicle: 0,
    policy_vehicle: null,
    insurer: null,
    workshop: null,
    claim_date: '',
    broker_report_date: null,
    insurer_report_date: null,
    documentation_date: null,
    repair_authorization_date: null,
    estimated_departure_date: null,
    payment_date: null,
    damage_type: 'other',
    coverage_type: null,
    payment_type: null,
    claim_description: '',
    vehicle_driver: '',
    insurer_executive: '',
    insurer_executive_phone: '',
    claim_amount: null,
    adjusted_amount: null,
    delivery_status_confirmation: '',
    status: 'reported',
    is_active: true,
    documents: [],
};

function mapClaimToPayload(claim: Claim): ClaimWritePayload {
    return {
        insured_customer: claim.insured_customer,
        vehicle: claim.vehicle,
        policy_vehicle: claim.policy_vehicle ?? null,
        insurer: claim.insurer,
        workshop: claim.workshop,
        claim_date: claim.claim_date,
        broker_report_date: claim.broker_report_date,
        insurer_report_date: claim.insurer_report_date,
        documentation_date: claim.documentation_date ?? null,
        repair_authorization_date: claim.repair_authorization_date,
        estimated_departure_date: claim.estimated_departure_date,
        payment_date: claim.payment_date,
        damage_type: claim.damage_type,
        coverage_type: claim.coverage_type ?? null,
        payment_type: claim.payment_type ?? null,
        claim_description: claim.claim_description,
        vehicle_driver: claim.vehicle_driver,
        insurer_executive: claim.insurer_executive,
        insurer_executive_phone: claim.insurer_executive_phone,
        claim_amount: claim.claim_amount,
        adjusted_amount: claim.adjusted_amount,
        delivery_status_confirmation: claim.delivery_status_confirmation,
        status: claim.status,
        is_active: claim.is_active,
        documents: claim.documents?.map(document => ({
            id: document.id,
            document_type: document.document_type,
            delivered: document.delivered,
            observation: document.observation,
            delivery_date: document.delivery_date,
        })) || [],
    };
}

function normalizeDate(value?: string | null): string {
    return value || '';
}

function isFutureDate(value?: string | null): boolean {
    return Boolean(value && value > TODAY);
}

function translateApiFieldError(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes('future')) return 'La fecha no puede ser futura.';
    if (normalized.includes('required') || normalized.includes('blank') || normalized.includes('null')) return 'Campo requerido.';
    if (normalized.includes('cannot be changed')) return 'Este campo no puede modificarse en este estado del siniestro.';
    return message;
}

function normalizeApiFieldErrors(fieldErrors?: Record<string, string>): Record<string, string> {
    return Object.entries(fieldErrors ?? {}).reduce<Record<string, string>>((acc, [field, message]) => {
        if (message) acc[field] = translateApiFieldError(message);
        return acc;
    }, {});
}

function getTabForError(errors: Record<string, string>): TabKey {
    const firstField = Object.keys(errors).find(field => errors[field]);
    if (!firstField) return 'general';
    if (firstField === 'claim_date' || ['insured_customer', 'vehicle', 'damage_type', 'claim_description', 'vehicle_driver', 'status'].includes(firstField)) return 'general';
    if (['workshop', 'insurer', 'policy_vehicle', 'claim_amount', 'adjusted_amount', 'delivery_status_confirmation'].includes(firstField)) return 'aseguradora';
    if (['documents', 'document_type', 'delivery_date'].includes(firstField)) return 'documentos';
    if (FUTURE_DATE_FIELDS.includes(firstField as keyof ClaimWritePayload)) return 'fechas';
    return 'general';
}

function validateClaimAmounts(form: ClaimWritePayload, errors: Record<string, string>) {
    const claimAmount = form.claim_amount ? Number(form.claim_amount) : null;
    const adjustedAmount = form.adjusted_amount ? Number(form.adjusted_amount) : null;

    if (claimAmount !== null && (claimAmount <= 0 || Number.isNaN(claimAmount))) {
        errors.claim_amount = 'Debe ser mayor que 0.';
    }
    if (adjustedAmount !== null && (adjustedAmount <= 0 || Number.isNaN(adjustedAmount))) {
        errors.adjusted_amount = 'Debe ser mayor que 0.';
    }
    if (claimAmount !== null && adjustedAmount !== null && adjustedAmount > claimAmount) {
        errors.adjusted_amount = 'No puede ser mayor que claim_amount.';
    }
}

function validateClaimDates(form: ClaimWritePayload, errors: Record<string, string>) {
    for (const field of FUTURE_DATE_FIELDS) {
        if (isFutureDate(form[field] as string | null)) {
            errors[field] = `${DATE_FIELD_LABELS[field] ?? 'La fecha'} no puede ser futura.`;
        }
    }

    const datePairs: Array<[keyof ClaimWritePayload, keyof ClaimWritePayload]> = [
        ['broker_report_date', 'claim_date'],
        ['insurer_report_date', 'broker_report_date'],
        ['documentation_date', 'insurer_report_date'],
        ['repair_authorization_date', 'insurer_report_date'],
        ['estimated_departure_date', 'repair_authorization_date'],
        ['payment_date', 'repair_authorization_date'],
    ];
    for (const [currentKey, referenceKey] of datePairs) {
        const currentDate = normalizeDate(form[currentKey] as string | null);
        const referenceDate = normalizeDate(form[referenceKey] as string | null);
        if (currentDate && referenceDate && currentDate < referenceDate) {
            errors[currentKey] = `No puede ser menor que ${String(referenceKey)}.`;
        }
    }
}

function validateForm(form: ClaimWritePayload): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!form.insured_customer) errors.insured_customer = 'Campo requerido.';
    if (!form.vehicle) errors.vehicle = 'Campo requerido.';
    if (!form.workshop) errors.workshop = 'Campo requerido.';
    if (!form.insurer) errors.insurer = 'Campo requerido.';
    if (!form.claim_date) errors.claim_date = 'Campo requerido.';
    if (!form.claim_description?.trim()) errors.claim_description = 'Campo requerido.';

    validateClaimAmounts(form, errors);
    validateClaimDates(form, errors);

    return errors;
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

function isActiveCliente(cliente: Cliente): boolean {
    return cliente.is_active !== false;
}

function isActiveVehiculo(vehiculo: Vehiculo): boolean {
    return vehiculo.is_active !== false;
}

function isActiveTaller(taller: Taller): boolean {
    return taller.is_active !== false;
}

function formatClienteOption(cliente: Cliente): string {
    const code = cliente.customer_code ? `${cliente.customer_code} - ` : '';
    const name = `${cliente.first_names} ${cliente.last_names}`.trim();
    return `${code}${name} (${cliente.document_number})`;
}

function formatVehiculoOption(vehicle: Vehiculo): string {
    return `${vehicle.license_plate} - ${vehicle.brand} ${vehicle.model} (${vehicle.year})`;
}

function formatPolicyOption(policy: Policy): string {
    return `${policy.policy_number} - ${policy.valid_from} / ${policy.valid_until}`;
}

const DAMAGE_TYPE_OPTIONS: Array<{ value: ClaimDamageType; label: string }> = [
    { value: 'partial', label: 'Parcial' },
    { value: 'total', label: 'Total' },
    { value: 'third_party', label: 'Tercero' },
    { value: 'other', label: 'Otro' },
];

const COVERAGE_TYPE_OPTIONS: Array<{ value: ClaimCoverageType; label: string }> = [
    { value: 'own_damage', label: 'Daños propios' },
    { value: 'civil_liability', label: 'Responsabilidad civil' },
];

const PAYMENT_TYPE_OPTIONS: Array<{ value: ClaimPaymentType; label: string }> = [
    { value: 'workshop_assignment', label: 'Asignacion a taller' },
    { value: 'reimbursement', label: 'Reembolso' },
];

const STATUS_OPTIONS: Array<{ value: ClaimStatus; label: string }> = [
    { value: 'reported', label: 'Reportado' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'authorized', label: 'Autorizado' },
    { value: 'under_repair', label: 'En reparacion' },
    { value: 'closed', label: 'Cerrado' },
];

const DOCUMENT_TYPE_OPTIONS: Array<{ value: ClaimDocumentWrite['document_type']; label: string }> = [
    { value: 'id_card', label: 'Cedula' },
    { value: 'license', label: 'Licencia' },
    { value: 'registration', label: 'Matricula' },
    { value: 'form', label: 'Formulario' },
    { value: 'estimate', label: 'Proforma' },
    { value: 'other', label: 'Otro' },
];

function useSiniestroDataDependencies(isOpen: boolean, isViewingOrEditing: boolean) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [talleres, setTalleres] = useState<Taller[]>([]);
    const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
    const [policies, setPolicies] = useState<Policy[]>([]);

    const [loadingClientes, setLoadingClientes] = useState(false);
    const [loadingVehiculos, setLoadingVehiculos] = useState(false);
    const [loadingTalleres, setLoadingTalleres] = useState(false);
    const [loadingAseguradoras, setLoadingAseguradoras] = useState(false);
    const [loadingPolicies, setLoadingPolicies] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const query = isViewingOrEditing ? { page_size: 100 } : { is_active: true, page_size: 100 };
        const queryActive = isViewingOrEditing ? { page_size: 100 } : { is_active: true, status: 'active', page_size: 100 } as any;

        setLoadingClientes(true);
        getClientes(query).then(setClientes).catch(() => setClientes([])).finally(() => setLoadingClientes(false));

        setLoadingVehiculos(true);
        getVehiculos(query).then(setVehiculos).catch(() => setVehiculos([])).finally(() => setLoadingVehiculos(false));

        setLoadingTalleres(true);
        getTalleres(query).then(setTalleres).catch(() => setTalleres([])).finally(() => setLoadingTalleres(false));

        setLoadingAseguradoras(true);
        getAseguradoras(query).then(setAseguradoras).catch(() => setAseguradoras([])).finally(() => setLoadingAseguradoras(false));

        setLoadingPolicies(true);
        getPolicies(queryActive).then(setPolicies).catch(() => setPolicies([])).finally(() => setLoadingPolicies(false));
    }, [isOpen, isViewingOrEditing]);

    return {
        clientes, vehiculos, talleres, aseguradoras, policies,
        loadingClientes, loadingVehiculos, loadingTalleres, loadingAseguradoras, loadingPolicies
    };
}

function useSiniestroDocumentHandling(
    form: ClaimWritePayload,
    setForm: React.Dispatch<React.SetStateAction<ClaimWritePayload>>,
    claimToShow: Claim | null,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) {
    const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
    const [newDocumentType, setNewDocumentType] = useState<ClaimDocumentWrite['document_type']>('id_card');
    const [newDocumentDelivered, setNewDocumentDelivered] = useState(false);
    const [newDocumentObservation, setNewDocumentObservation] = useState('');
    const [newDocumentDeliveryDate, setNewDocumentDeliveryDate] = useState('');
    const [newDocumentError, setNewDocumentError] = useState<string | null>(null);
    const [removedDocumentIds, setRemovedDocumentIds] = useState<number[]>([]);

    const addDocument = () => {
        setNewDocumentError(null);

        if (!newDocumentType) {
            setNewDocumentError('Seleccione el tipo de documento.');
            return;
        }

        const isDuplicatedType = (form.documents || [])
            .filter(document => !(document.id && removedDocumentIds.includes(document.id)))
            .some(document => document.document_type === newDocumentType);

        if (isDuplicatedType) {
            setNewDocumentError('Ya existe un documento de este tipo.');
            return;
        }

        if (newDocumentDelivered && !newDocumentFile) {
            setNewDocumentError('Si marca "Entregado", debe adjuntar un archivo.');
            return;
        }

        if (!newDocumentDelivered && newDocumentDeliveryDate) {
            setNewDocumentError('No se puede registrar fecha de entrega cuando no esta entregado.');
            return;
        }

        const newDocument: ClaimDocumentWrite = {
            document_type: newDocumentType,
            delivered: newDocumentDelivered,
            observation: newDocumentObservation,
            delivery_date: newDocumentDelivered ? (newDocumentDeliveryDate || null) : null,
            file: newDocumentFile,
        };
        setForm(prev => ({ ...prev, documents: [...(prev.documents || []), newDocument] }));
        setNewDocumentType('id_card');
        setNewDocumentDelivered(false);
        setNewDocumentObservation('');
        setNewDocumentDeliveryDate('');
        setNewDocumentFile(null);
    };

    const removeDocument = (index: number) => {
        const target = (form.documents || [])[index];
        if (target?.id) {
            setRemovedDocumentIds(prev => (prev.includes(target.id!) ? prev : [...prev, target.id!]));
        }
        setForm(prev => ({
            ...prev,
            documents: (prev.documents || []).filter((_, i) => i !== index),
        }));
    };

    const openDocumentUrl = async (documentId: number) => {
        if (!claimToShow?.id) return;
        try {
            const response = await getClaimDocumentUrl(claimToShow.id, documentId);
            window.open(response.url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            if (err?.isGlobal) return;
            setError(err.message || 'No se pudo abrir el documento.');
        }
    };

    const resetDocumentState = useCallback(() => {
        setNewDocumentFile(null);
        setNewDocumentObservation('');
        setNewDocumentDeliveryDate('');
        setNewDocumentDelivered(false);
        setNewDocumentType('id_card');
        setNewDocumentError(null);
        setRemovedDocumentIds([]);
    }, []);

    return {
        newDocumentFile, setNewDocumentFile,
        newDocumentType, setNewDocumentType,
        newDocumentDelivered, setNewDocumentDelivered,
        newDocumentObservation, setNewDocumentObservation,
        newDocumentDeliveryDate, setNewDocumentDeliveryDate,
        newDocumentError, setNewDocumentError,
        removedDocumentIds, setRemovedDocumentIds,
        addDocument, removeDocument, openDocumentUrl, resetDocumentState
    };
}

function useSiniestroSelectors(params: {
    form: ClaimWritePayload;
    clientes: Cliente[];
    vehiculos: Vehiculo[];
    talleres: Taller[];
    aseguradoras: Aseguradora[];
    policies: Policy[];
    selectedAseguradoraId: number | null;
    claimToShow: Claim | null;
}) {
    const { form, clientes, vehiculos, talleres, aseguradoras, policies, selectedAseguradoraId, claimToShow } = params;
    const clientOptions = useMemo(() => {
        return clientes
            .filter(client => isActiveCliente(client) || client.id === form.insured_customer)
            .map(client => ({
            id: client.id,
            label: formatClienteOption(client),
        }));
    }, [clientes, form.insured_customer]);

    const vehicleOptions = useMemo(() => {
        if (!form.insured_customer) return [];
        return vehiculos.filter(vehicle =>
            vehicle.owner_customer === form.insured_customer
            && (isActiveVehiculo(vehicle) || vehicle.id === form.vehicle)
        );
    }, [vehiculos, form.insured_customer, form.vehicle]);

    const selectableTalleres = talleres.filter(taller => isActiveTaller(taller) || taller.id === form.workshop);

    const selectedTaller = useMemo(() => {
        return talleres.find(taller => taller.id === form.workshop) || null;
    }, [talleres, form.workshop]);

    const selectedAseguradora = useMemo(() => {
        return aseguradoras.find(aseguradora => aseguradora.id === selectedAseguradoraId) || null;
    }, [aseguradoras, selectedAseguradoraId]);

    const insurerDetail: ClaimInsurerDetail | null = useMemo(() => {
        if (claimToShow?.insurer_detalle) return claimToShow.insurer_detalle;
        if (!selectedAseguradora) return null;
        return {
            id: selectedAseguradora.id,
            insurer_code: selectedAseguradora.insurer_code,
            name: selectedAseguradora.name,
            claims_executive_name: selectedAseguradora.claims_executive_name,
            claims_executive_phone: selectedAseguradora.claims_executive_phone,
            claims_executive_email: selectedAseguradora.claims_executive_email,
        };
    }, [claimToShow, selectedAseguradora]);

    const selectableAseguradoras = useMemo(() => {
        const activeAseguradoras = aseguradoras.filter(aseguradora => aseguradora.is_active !== false || aseguradora.id === selectedAseguradoraId);
        const linkedIds = new Set([
            ...(selectedTaller?.insurer_ids || []),
            ...(selectedTaller?.insurers_summary || []).map(insurer => insurer.id),
        ]);

        if (linkedIds.size === 0) return activeAseguradoras;
        return activeAseguradoras.filter(aseguradora => linkedIds.has(aseguradora.id) || aseguradora.id === selectedAseguradoraId);
    }, [aseguradoras, selectedAseguradoraId, selectedTaller]);

    const policyOptions = useMemo(() => {
        if (!form.insured_customer || !form.vehicle || !form.insurer) return [];
        const claimDate = normalizeDate(form.claim_date);
        return policies.filter(policy => {
            const includesVehicle = (policy.vehicles || []).some(item => item.vehicle === form.vehicle);
            const isSameContext = policy.insured_customer === form.insured_customer && policy.insurer === form.insurer && includesVehicle;
            const isCurrentPolicy = policy.id === form.policy_vehicle;
            const isActive = policy.is_active !== false && policy.status === 'active';
            const isInValidity = !claimDate || (policy.valid_from <= claimDate && policy.valid_until >= claimDate);
            return (isSameContext && isActive && isInValidity) || isCurrentPolicy;
        });
    }, [policies, form.insured_customer, form.vehicle, form.insurer, form.claim_date, form.policy_vehicle]);

    return {
        clientOptions, vehicleOptions, selectableTalleres, selectedTaller, insurerDetail, selectableAseguradoras, policyOptions
    };
}

function buildInitialPayload(form: ClaimWritePayload, removedDocumentIds: number[]): ClaimWritePayload {
    const up = (s: string | undefined) => (s || '').trim().toUpperCase();
    return {
        ...form,
        claim_description: up(form.claim_description),
        vehicle_driver: up(form.vehicle_driver),
        insurer_executive: up(form.insurer_executive),
        delivery_status_confirmation: up(form.delivery_status_confirmation),
        insurer_executive_phone: (form.insurer_executive_phone || '').trim(),
        claim_amount: form.claim_amount || null,
        adjusted_amount: form.adjusted_amount || null,
        documents: [
            ...((form.documents || []).map(document => ({
                ...document,
                observation: document.observation || '',
            }))),
            ...removedDocumentIds.map(id => ({ id, delete: true })),
        ],
    };
}

function sanitizeClaimPayload(
    payload: ClaimWritePayload,
    editingId: number | null,
    isReportedToInsurer: boolean
): Partial<ClaimWritePayload> {
    const payloadToSave: Partial<ClaimWritePayload> = { ...payload };

    if (editingId) {
        delete payloadToSave.claim_date;
        delete payloadToSave.broker_report_date;
        delete payloadToSave.insurer_report_date;
    } else {
        delete payloadToSave.broker_report_date;
        delete payloadToSave.insurer_report_date;
        delete payloadToSave.documentation_date;
        delete payloadToSave.repair_authorization_date;
        delete payloadToSave.estimated_departure_date;
        delete payloadToSave.payment_date;
        delete payloadToSave.status;
        delete payloadToSave.is_active;
    }

    if (editingId && isReportedToInsurer) {
        delete payloadToSave.workshop;
        delete payloadToSave.insurer;
    }

    delete payloadToSave.insurer_executive;
    delete payloadToSave.insurer_executive_phone;

    return payloadToSave;
}

function useSiniestroFormLogic(params: SiniestroFormModalProps) {
    const { isOpen, onClose, onSaveSuccess, editingSiniestro, viewingSiniestro, canMutate } = params;

    const [form, setForm] = useState<ClaimWritePayload>({ ...EMPTY_FORM });
    const [currentTab, setCurrentTab] = useState<TabKey>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [selectedAseguradoraId, setSelectedAseguradoraId] = useState<number | null>(null);

    const isReadOnly = !!viewingSiniestro || !canMutate;
    const editingId = editingSiniestro?.id ?? null;
    const claimToShow = viewingSiniestro || editingSiniestro || null;
    const showTrackingDates = Boolean(claimToShow);
    const isReportedToInsurer = Boolean(form.insurer_report_date || claimToShow?.insurer_report_date);
    const isViewingOrEditing = Boolean(editingSiniestro || viewingSiniestro);

    const dataDeps = useSiniestroDataDependencies(isOpen, isViewingOrEditing);
    const { clientes, vehiculos, talleres, aseguradoras, policies } = dataDeps;

    const docHandling = useSiniestroDocumentHandling(form, setForm, claimToShow, setError);
    const { removedDocumentIds, resetDocumentState } = docHandling;

    const selectors = useSiniestroSelectors({
        form, clientes, vehiculos, talleres, aseguradoras, policies, selectedAseguradoraId, claimToShow
    });

    useEffect(() => {
        if (!isOpen) return;
        setCurrentTab('general');
        setError(null);
        setFieldErrors({});
        resetDocumentState();
        if (editingSiniestro) {
            setForm(mapClaimToPayload(editingSiniestro));
            setSelectedAseguradoraId(editingSiniestro.insurer ?? null);
        } else if (viewingSiniestro) {
            setForm(mapClaimToPayload(viewingSiniestro));
            setSelectedAseguradoraId(viewingSiniestro.insurer ?? null);
        } else {
            setForm({ ...EMPTY_FORM });
            setSelectedAseguradoraId(null);
        }
    }, [isOpen, editingSiniestro, viewingSiniestro, resetDocumentState]);

    const setValue = (key: keyof ClaimWritePayload, value: unknown) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
    };

    const handleWorkshopChange = (value: string) => {
        const workshopId = value ? Number(value) : null;
        setForm(prev => ({
            ...prev,
            workshop: workshopId,
            insurer: null,
            policy_vehicle: null,
            insurer_executive: '',
            insurer_executive_phone: '',
        }));
        setSelectedAseguradoraId(null);
        if (fieldErrors.workshop || fieldErrors.insurer || fieldErrors.policy_vehicle) {
            setFieldErrors(prev => ({ ...prev, workshop: '', insurer: '', policy_vehicle: '' }));
        }
    };

    const handleAseguradoraChange = (value: string) => {
        const aseguradoraId = value ? Number(value) : null;
        const aseguradora = aseguradoraId ? aseguradoras.find(item => item.id === aseguradoraId) : null;
        setSelectedAseguradoraId(aseguradoraId);
        setForm(prev => ({
            ...prev,
            insurer: aseguradoraId,
            policy_vehicle: null,
            insurer_executive: aseguradora?.claims_executive_name || '',
            insurer_executive_phone: aseguradora?.claims_executive_phone || '',
        }));
        if (fieldErrors.insurer || fieldErrors.insurer_executive || fieldErrors.insurer_executive_phone) {
            setFieldErrors(prev => ({ ...prev, insurer: '', policy_vehicle: '', insurer_executive: '', insurer_executive_phone: '' }));
        }
    };

    const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isReadOnly) {
            onClose();
            return;
        }

        const payload = buildInitialPayload(form, removedDocumentIds);
        const validationErrors = validateForm(payload);

        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            setError('Revise los campos requeridos.');
            setCurrentTab(getTabForError(validationErrors));
            return;
        }

        const payloadToSave = sanitizeClaimPayload(payload, editingId, isReportedToInsurer);

        setIsSaving(true);
        setError(null);
        try {
            if (editingId) {
                await partialUpdateSiniestro(editingId, payloadToSave);
                onSaveSuccess();
            } else {
                const created = await createSiniestro(payloadToSave as ClaimWritePayload);
                onSaveSuccess(created);
            }
            onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            const raw = err?.message || 'Error al guardar siniestro.';
            const apiErrors = Object.keys(err?.fieldErrors ?? {}).length > 0
                ? normalizeApiFieldErrors(err.fieldErrors)
                : parseApiFieldErrors(raw);
            if (Object.keys(apiErrors).length > 0) {
                setFieldErrors(apiErrors);
                setError('Por favor, revise los campos marcados en rojo.');
                setCurrentTab(getTabForError(apiErrors));
            } else {
                setError(raw);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form, setForm, currentTab, setCurrentTab, isSaving, error, fieldErrors, setFieldErrors,
        selectedAseguradoraId, setSelectedAseguradoraId,
        isReadOnly, editingId, claimToShow, showTrackingDates, isReportedToInsurer,
        dataDeps, docHandling, selectors,
        setValue, handleWorkshopChange, handleAseguradoraChange, onSubmit
    };
}

function getVehiclePlaceholder(loading: boolean, customerId: any, optionsLength: number) {
    if (loading) return 'Cargando vehículos...';
    if (!customerId) return 'Seleccione primero un cliente';
    if (optionsLength === 0) return 'No hay vehículos activos para este cliente';
    return 'Seleccione un vehículo';
}

function getPolicyPlaceholder(loading: boolean, hasRequiredFields: boolean, optionsLength: number) {
    if (loading) return 'Cargando pólizas...';
    if (!hasRequiredFields) return 'Seleccione cliente, vehículo y aseguradora';
    if (optionsLength === 0) return 'No hay pólizas vigentes para este siniestro';
    return 'Sin póliza asociada';
}

function SiniestroTabGeneral({
    form, setForm, setValue, fieldErrors, setFieldErrors,
    isReadOnly, claimToShow, loadingClientes, clientOptions,
    loadingVehiculos, vehicleOptions
}: any) {
    return (
        <div className="form-grid">
            <div className="form-section">
                <div className="grid-2-col">
                    <div className="form-field">
                        <label htmlFor="insured_customer">Cliente Asegurado *</label>
                        <select
                            id="insured_customer"
                            value={form.insured_customer}
                            onChange={e => {
                                const nextCustomerId = Number(e.target.value) || 0;
                                setForm((prev: any) => ({
                                    ...prev,
                                    insured_customer: nextCustomerId,
                                    vehicle: 0,
                                    policy_vehicle: null,
                                }));
                                if (fieldErrors.insured_customer || fieldErrors.vehicle || fieldErrors.policy_vehicle) {
                                    setFieldErrors((prev: any) => ({
                                        ...prev,
                                        insured_customer: '',
                                        vehicle: '',
                                        policy_vehicle: '',
                                    }));
                                }
                            }}
                            disabled={isReadOnly || loadingClientes}
                            required
                        >
                            <option value={0}>{loadingClientes ? 'Cargando clientes...' : 'Seleccione un cliente'}</option>
                            {clientOptions.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                        <FieldError name="insured_customer" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="vehicle">Vehiculo *</label>
                        <select
                            id="vehicle"
                            value={form.vehicle}
                            onChange={e => {
                                setForm((prev: any) => ({ ...prev, vehicle: Number(e.target.value) || 0, policy_vehicle: null }));
                                if (fieldErrors.vehicle || fieldErrors.policy_vehicle) {
                                    setFieldErrors((prev: any) => ({ ...prev, vehicle: '', policy_vehicle: '' }));
                                }
                            }}
                            disabled={isReadOnly || loadingVehiculos || !form.insured_customer}
                            required
                        >
                            <option value={0}>
                                {getVehiclePlaceholder(loadingVehiculos, form.insured_customer, vehicleOptions.length)}
                            </option>
                            {vehicleOptions.map((vehicle: any) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {formatVehiculoOption(vehicle)}
                                </option>
                            ))}
                        </select>
                        <FieldError name="vehicle" errors={fieldErrors} />
                    </div>
                    {claimToShow && (
                        <div className="form-field">
                            <label htmlFor="claim_number">Número de Siniestro</label>
                            <input type="text" id="claim_number" value={claimToShow.claim_number || ''} disabled />
                        </div>
                    )}
                    <div className="form-field">
                        <label htmlFor="claim_date">Fecha del Siniestro *</label>
                        <input
                            id="claim_date"
                            type="date"
                            value={normalizeDate(form.claim_date)}
                            max={TODAY}
                            className={fieldErrors.claim_date ? 'field-invalid' : ''}
                            onChange={e => {
                                setForm((prev: any) => ({ ...prev, claim_date: e.target.value, policy_vehicle: null }));
                                if (fieldErrors.claim_date || fieldErrors.policy_vehicle) {
                                    setFieldErrors((prev: any) => ({ ...prev, claim_date: '', policy_vehicle: '' }));
                                }
                            }}
                            disabled={isReadOnly || Boolean(claimToShow)}
                            readOnly={Boolean(claimToShow)}
                            required
                        />
                        <FieldError name="claim_date" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="damage_type">Tipo de Dano</label>
                        <select id="damage_type" value={form.damage_type || 'partial'} onChange={e => setValue('damage_type', e.target.value)} disabled={isReadOnly}>
                            {DAMAGE_TYPE_OPTIONS.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label htmlFor="coverage_type">Tipo de Cobertura</label>
                        <select id="coverage_type" value={form.coverage_type || ''} onChange={e => setValue('coverage_type', e.target.value || null)} disabled={isReadOnly}>
                            <option value="">Sin especificar</option>
                            {COVERAGE_TYPE_OPTIONS.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label htmlFor="payment_type">Tipo de Pago</label>
                        <select id="payment_type" value={form.payment_type || ''} onChange={e => setValue('payment_type', e.target.value || null)} disabled={isReadOnly}>
                            <option value="">Sin especificar</option>
                            {PAYMENT_TYPE_OPTIONS.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label htmlFor="vehicle_driver">Conductor</label>
                        <input type="text" id="vehicle_driver" value={form.vehicle_driver || ''} onChange={e => setValue('vehicle_driver', e.target.value)} disabled={isReadOnly} placeholder="Ej: Juan Perez" />
                    </div>
                    {claimToShow && (
                        <div className="form-field">
                            <label htmlFor="status">Estado</label>
                            <select id="status" value={form.status || 'reported'} onChange={e => setValue('status', e.target.value)} disabled={isReadOnly}>
                                {STATUS_OPTIONS.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-field span-2">
                        <label htmlFor="claim_description">Descripcion *</label>
                        <textarea id="claim_description" rows={3} value={form.claim_description || ''} onChange={e => setValue('claim_description', e.target.value)} disabled={isReadOnly} placeholder="Ej: Colision en interseccion con vehiculo de tercero" required />
                        <FieldError name="claim_description" errors={fieldErrors} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SiniestroTabFechas({ form, setValue, fieldErrors, isReadOnly }: any) {
    return (
        <div className="form-grid">
            <div className="form-section">
                <div className="grid-2-col">
                    <div className="form-field"><label htmlFor="broker_report_date">Fecha Reporte Broker</label><input id="broker_report_date" type="date" value={normalizeDate(form.broker_report_date)} max={TODAY} className={fieldErrors.broker_report_date ? 'field-invalid' : ''} disabled readOnly /><FieldError name="broker_report_date" errors={fieldErrors} /></div>
                    <div className="form-field"><label htmlFor="insurer_report_date">Fecha Reporte Aseguradora</label><input id="insurer_report_date" type="date" value={normalizeDate(form.insurer_report_date)} max={TODAY} className={fieldErrors.insurer_report_date ? 'field-invalid' : ''} disabled readOnly /><FieldError name="insurer_report_date" errors={fieldErrors} /></div>
                    <div className="form-field"><label htmlFor="documentation_date">Fecha Documentacion</label><input id="documentation_date" type="date" value={normalizeDate(form.documentation_date)} max={TODAY} className={fieldErrors.documentation_date ? 'field-invalid' : ''} onChange={e => setValue('documentation_date', e.target.value || null)} disabled={isReadOnly} /><FieldError name="documentation_date" errors={fieldErrors} /></div>
                    <div className="form-field"><label htmlFor="repair_authorization_date">Fecha Autorizacion Reparacion</label><input id="repair_authorization_date" type="date" value={normalizeDate(form.repair_authorization_date)} max={TODAY} className={fieldErrors.repair_authorization_date ? 'field-invalid' : ''} onChange={e => setValue('repair_authorization_date', e.target.value || null)} disabled={isReadOnly} /><FieldError name="repair_authorization_date" errors={fieldErrors} /></div>
                    <div className="form-field"><label htmlFor="estimated_departure_date">Fecha Salida Estimada</label><input id="estimated_departure_date" type="date" value={normalizeDate(form.estimated_departure_date)} max={TODAY} className={fieldErrors.estimated_departure_date ? 'field-invalid' : ''} onChange={e => setValue('estimated_departure_date', e.target.value || null)} disabled={isReadOnly} /><FieldError name="estimated_departure_date" errors={fieldErrors} /></div>
                    <div className="form-field"><label htmlFor="payment_date">Fecha Pago</label><input id="payment_date" type="date" value={normalizeDate(form.payment_date)} max={TODAY} className={fieldErrors.payment_date ? 'field-invalid' : ''} onChange={e => setValue('payment_date', e.target.value || null)} disabled={isReadOnly} /><FieldError name="payment_date" errors={fieldErrors} /></div>
                </div>
            </div>
        </div>
    );
}

function SiniestroTabAseguradora({
    form, setValue, fieldErrors, isReadOnly, isReportedToInsurer,
    loadingTalleres, selectableTalleres, selectedTaller, handleWorkshopChange,
    loadingAseguradoras, selectableAseguradoras, selectedAseguradoraId, handleAseguradoraChange,
    loadingPolicies, policyOptions, insurerDetail
}: any) {
    return (
        <div className="form-grid">
            <div className="form-section">
                <div className="grid-2-col">
                    <div className="form-field">
                        <label htmlFor="workshop">Taller *</label>
                        <select
                            id="workshop"
                            value={form.workshop ?? ''}
                            onChange={e => handleWorkshopChange(e.target.value)}
                            disabled={isReadOnly || loadingTalleres || isReportedToInsurer}
                        >
                            <option value="">{loadingTalleres ? 'Cargando talleres...' : 'Sin taller'}</option>
                            {selectableTalleres.map((taller: any) => (
                                <option key={taller.id} value={taller.id}>
                                    {taller.name}
                                </option>
                            ))}
                        </select>
                        <FieldError name="workshop" errors={fieldErrors} />
                        {selectedTaller && (
                            <small className="help-text">
                                {selectedTaller.address ? `Direccion: ${selectedTaller.address}` : ''}
                                {selectedTaller.address && selectedTaller.phone ? ' · ' : ''}
                                {selectedTaller.phone ? `Telefono: ${selectedTaller.phone}` : ''}
                            </small>
                        )}
                    </div>
                    <div className="form-field">
                        <label htmlFor="insurer">Aseguradora *</label>
                        <select
                            id="insurer"
                            value={selectedAseguradoraId ?? ''}
                            onChange={e => handleAseguradoraChange(e.target.value)}
                            disabled={isReadOnly || loadingAseguradoras || isReportedToInsurer}
                            required
                        >
                            <option value="">{loadingAseguradoras ? 'Cargando aseguradoras...' : 'Seleccione una aseguradora'}</option>
                            {selectableAseguradoras.map((aseguradora: any) => (
                                <option key={aseguradora.id} value={aseguradora.id}>
                                    {aseguradora.name} ({aseguradora.insurer_code})
                                </option>
                            ))}
                        </select>
                        <FieldError name="insurer" errors={fieldErrors} />
                    </div>
                    <div className="form-field span-2">
                        <label htmlFor="policy_vehicle">Póliza asociada</label>
                        <select
                            id="policy_vehicle"
                            value={form.policy_vehicle ?? ''}
                            onChange={e => setValue('policy_vehicle', e.target.value ? Number(e.target.value) : null)}
                            disabled={isReadOnly || loadingPolicies || !form.insured_customer || !form.vehicle || !form.insurer}
                        >
                            <option value="">
                                {getPolicyPlaceholder(loadingPolicies, Boolean(form.insured_customer && form.vehicle && form.insurer), policyOptions.length)}
                            </option>
                            {policyOptions.map((policy: any) => (
                                <option key={policy.id} value={policy.id}>
                                    {formatPolicyOption(policy)}
                                </option>
                            ))}
                        </select>
                        <FieldError name="policy_vehicle" errors={fieldErrors} />
                    </div>
                    <div className="form-field"><label htmlFor="insurer_executive">Ejecutivo Aseguradora</label><input type="text" id="insurer_executive" value={insurerDetail?.claims_executive_name || ''} readOnly disabled /></div>
                    <div className="form-field"><label htmlFor="insurer_executive_phone">Telefono Ejecutivo</label><input type="tel" id="insurer_executive_phone" value={insurerDetail?.claims_executive_phone || ''} readOnly disabled /></div>
                    <div className="form-field">
                        <label htmlFor="claims_executive_email">Correo Ejecutivo Siniestros</label>
                        <input type="email" id="claims_executive_email" value={insurerDetail?.claims_executive_email || ''} readOnly disabled />
                    </div>
                    <div className="form-field"><label htmlFor="claim_amount">Valor del Siniestro</label><input type="text" id="claim_amount" inputMode="decimal" value={form.claim_amount || ''} onChange={e => setValue('claim_amount', e.target.value || null)} disabled={isReadOnly} placeholder="Ej: 2500.00" /></div>
                    <div className="form-field"><label htmlFor="adjusted_amount">Valor Ajustado</label><input type="text" id="adjusted_amount" inputMode="decimal" value={form.adjusted_amount || ''} onChange={e => setValue('adjusted_amount', e.target.value || null)} disabled={isReadOnly} placeholder="Ej: 2000.00" /></div>
                    <div className="form-field span-2"><label htmlFor="delivery_status_confirmation">Confirmacion Estado Entrega</label><input type="text" id="delivery_status_confirmation" value={form.delivery_status_confirmation || ''} onChange={e => setValue('delivery_status_confirmation', e.target.value)} disabled={isReadOnly} placeholder="Ej: Vehiculo entregado al cliente el 15/01/2024" /></div>
                </div>
            </div>
        </div>
    );
}

function SiniestroTabDocumentos({
    isReadOnly, form,
    newDocumentFile, setNewDocumentFile, newDocumentType, setNewDocumentType,
    newDocumentDelivered, setNewDocumentDelivered, newDocumentObservation, setNewDocumentObservation,
    newDocumentDeliveryDate, setNewDocumentDeliveryDate, newDocumentError,
    addDocument, removeDocument, openDocumentUrl, getDocumentTypeLabel
}: any) {
    return (
        <div className="form-grid">
            <div className="form-section">
                <h3>Documentos</h3>
                <p className="help-text">Seleccione tipo y si fue entregado. Si fue entregado, agregue fecha y archivo.</p>
                {!isReadOnly && (
                    <div className="grid-2-col">
                        <div className="form-field">
                            <label htmlFor="doc_type">Tipo</label>
                            <select id="doc_type" value={newDocumentType || 'id_card'} onChange={e => setNewDocumentType(e.target.value)}>
                                {DOCUMENT_TYPE_OPTIONS.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label htmlFor="doc_delivered">Entregado</label>
                            <select id="doc_delivered" value={String(newDocumentDelivered)} onChange={e => setNewDocumentDelivered(e.target.value === 'true')}>
                                <option value="false">No</option>
                                <option value="true">Si</option>
                            </select>
                        </div>
                        <div className="form-field span-2">
                            <label htmlFor="doc_observation">Observacion</label>
                            <input type="text" id="doc_observation" value={newDocumentObservation} onChange={e => setNewDocumentObservation(e.target.value)} placeholder="Ej: Documento en buen estado" />
                        </div>
                        {newDocumentDelivered && (
                            <>
                                <div className="form-field">
                                    <label htmlFor="doc_delivery_date">Fecha entrega</label>
                                    <input id="doc_delivery_date" type="date" value={newDocumentDeliveryDate} max={TODAY} onChange={e => setNewDocumentDeliveryDate(e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="doc_file">Archivo</label>
                                    <input id="doc_file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNewDocumentFile(e.target.files?.[0] || null)} />
                                    {newDocumentFile ? <small className="help-text">Seleccionado: {newDocumentFile.name}</small> : null}
                                </div>
                            </>
                        )}
                        <div className="form-field span-2">
                            <button type="button" className="btn-secondary" onClick={addDocument}>Agregar documento</button>
                        </div>
                        {newDocumentError ? <div className="form-field span-2"><span className="field-error">{newDocumentError}</span></div> : null}
                    </div>
                )}

                <div style={{ marginTop: 12 }}>
                    {(form.documents || []).length === 0 && <p className="help-text">No hay documentos.</p>}
                    {(form.documents || []).map((document: any, index: number) => (
                        <div key={`${document.id || 'new'}-${index}`} className="file-chip" style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                            <span>
                                {getDocumentTypeLabel(document.document_type)} {document.delivered ? '(entregado)' : '(pendiente)'}
                                {document.delivery_date ? ` · Entrega: ${document.delivery_date}` : ''}
                            </span>
                            {document.id && document.id !== 'new' && (
                                <button type="button" className="btn-secondary" onClick={() => openDocumentUrl(document.id)}>Ver</button>
                            )}
                            {!isReadOnly && <button type="button" className="btn-secondary" onClick={() => removeDocument(index)}>Quitar</button>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SiniestroFormModal({
    isOpen, onClose, onSaveSuccess, editingSiniestro, viewingSiniestro, canMutate
}: SiniestroFormModalProps) {
    const {
        form, setForm, currentTab, setCurrentTab, isSaving, error, fieldErrors, setFieldErrors,
        selectedAseguradoraId,
        isReadOnly, editingId, claimToShow, showTrackingDates, isReportedToInsurer,
        dataDeps, docHandling, selectors,
        setValue, handleWorkshopChange, handleAseguradoraChange, onSubmit
    } = useSiniestroFormLogic({ isOpen, onClose, onSaveSuccess, editingSiniestro, viewingSiniestro, canMutate });

    const { loadingClientes, loadingVehiculos, loadingTalleres, loadingAseguradoras, loadingPolicies } = dataDeps;
    
    const {
        newDocumentFile, setNewDocumentFile, newDocumentType, setNewDocumentType,
        newDocumentDelivered, setNewDocumentDelivered, newDocumentObservation, setNewDocumentObservation,
        newDocumentDeliveryDate, setNewDocumentDeliveryDate, newDocumentError,
        removedDocumentIds, addDocument, removeDocument, openDocumentUrl
    } = docHandling;

    const {
        clientOptions, vehicleOptions, selectableTalleres, selectedTaller, insurerDetail, selectableAseguradoras, policyOptions
    } = selectors;

    const initialForm = useMemo(() => {
        return editingSiniestro ? mapClaimToPayload(editingSiniestro) : null;
    }, [editingSiniestro]);
    
    const hasChanges = !editingId
        || (initialForm ? isFormDirty(form, initialForm) : true)
        || removedDocumentIds.length > 0;
        
    const submitLabel = getSaveButtonLabel(isSaving, Boolean(editingId));

    if (!isOpen) return null;

    const getDocumentTypeLabel = (value?: ClaimDocumentWrite['document_type']) => {
        return DOCUMENT_TYPE_OPTIONS.find(option => option.value === value)?.label || 'Documento';
    };

    let title = 'Registrar Siniestro';
    if (viewingSiniestro) title = 'Detalles del Siniestro';
    else if (editingSiniestro) title = 'Actualizar Siniestro';

    return (
        <div className="modal-overlay">
            <div className="modal-box siniestro-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="modal-tabs">
                    <button type="button" className={`tab-btn ${currentTab === 'general' ? 'active' : ''}`} onClick={() => setCurrentTab('general')}>Informacion General</button>
                    {showTrackingDates && (
                        <button type="button" className={`tab-btn ${currentTab === 'fechas' ? 'active' : ''}`} onClick={() => setCurrentTab('fechas')}>Fechas y Reportes</button>
                    )}
                    <button type="button" className={`tab-btn ${currentTab === 'aseguradora' ? 'active' : ''}`} onClick={() => setCurrentTab('aseguradora')}>Aseguradora y Taller</button>
                    <button type="button" className={`tab-btn ${currentTab === 'documentos' ? 'active' : ''}`} onClick={() => setCurrentTab('documentos')}>Documentos</button>
                </div>

                {error && <div className="action-error" style={{ margin: '0 24px 16px' }}>{error}</div>}

                <form className="modal-body-scroll" onSubmit={onSubmit} noValidate>
                    {currentTab === 'general' && (
                        <SiniestroTabGeneral
                            form={form} setForm={setForm} setValue={setValue} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors}
                            isReadOnly={isReadOnly} claimToShow={claimToShow} loadingClientes={loadingClientes} clientOptions={clientOptions}
                            loadingVehiculos={loadingVehiculos} vehicleOptions={vehicleOptions}
                        />
                    )}

                    {showTrackingDates && currentTab === 'fechas' && (
                        <SiniestroTabFechas
                            form={form} setValue={setValue} fieldErrors={fieldErrors} isReadOnly={isReadOnly}
                        />
                    )}

                    {currentTab === 'aseguradora' && (
                        <SiniestroTabAseguradora
                            form={form} setValue={setValue} fieldErrors={fieldErrors} isReadOnly={isReadOnly}
                            isReportedToInsurer={isReportedToInsurer}
                            loadingTalleres={loadingTalleres} selectableTalleres={selectableTalleres}
                            selectedTaller={selectedTaller} handleWorkshopChange={handleWorkshopChange}
                            loadingAseguradoras={loadingAseguradoras} selectableAseguradoras={selectableAseguradoras}
                            selectedAseguradoraId={selectedAseguradoraId} handleAseguradoraChange={handleAseguradoraChange}
                            loadingPolicies={loadingPolicies} policyOptions={policyOptions} insurerDetail={insurerDetail}
                        />
                    )}

                    {currentTab === 'documentos' && (
                        <SiniestroTabDocumentos
                            isReadOnly={isReadOnly} form={form}
                            newDocumentFile={newDocumentFile} setNewDocumentFile={setNewDocumentFile}
                            newDocumentType={newDocumentType} setNewDocumentType={setNewDocumentType}
                            newDocumentDelivered={newDocumentDelivered} setNewDocumentDelivered={setNewDocumentDelivered}
                            newDocumentObservation={newDocumentObservation} setNewDocumentObservation={setNewDocumentObservation}
                            newDocumentDeliveryDate={newDocumentDeliveryDate} setNewDocumentDeliveryDate={setNewDocumentDeliveryDate}
                            newDocumentError={newDocumentError} addDocument={addDocument} removeDocument={removeDocument}
                            openDocumentUrl={openDocumentUrl} getDocumentTypeLabel={getDocumentTypeLabel}
                        />
                    )}

                    <div className="modal-actions-fixed">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button type="submit" className="btn-primary" disabled={isSaving || (Boolean(editingId) && !hasChanges)}>
                                {submitLabel}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}