/// <summary>
/// Componente PolicyFormModal.tsx
/// </summary>
import './PolicyFormModal.css';
import '../../Vehiculos/components/VehiculoFormModal.css';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import type { Aseguradora } from '../../../types/aseguradora';
import type { Cliente } from '../../../types/cliente';
import type { Vehiculo } from '../../../types/vehiculo';
import type {
    Policy, PolicyClause, PolicyClauseType, PolicyCoverage, PolicyCoverageType,
    PolicyCoverageName, PolicyDeductible, PolicyDeductibleType, PolicyDocumentType,
    PolicyGeneralCoverage, PolicyInstallment, PolicyStatus, PolicyType, 
    PolicyVehicle, PolicyWritePayload,
} from '../../../types/policy';
import {
    createPolicy, getPolicyDocumentUrl, partialUpdatePolicy, sendToInsurer,
    activateWithEmail, updatePolicy, uploadPolicyDocument,
} from '../../../services/policies.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSaveSuccess: () => void;
    readonly editingPolicy?: Policy | null;
    readonly viewingPolicy?: Policy | null;
    readonly canMutate: boolean;
    readonly onOpenEdit?: (policy: Policy) => void;
}

type TabKey = 'general' | 'values' | 'vehicles' | 'clauses' | 'payments' | 'document';
type PolicyFormState = Omit<PolicyWritePayload, 'policy_number' | 'vehicles' | 'installments' | 'clauses'> & {
    policy_number: string;
    status: PolicyStatus;
    vehicles: PolicyVehicle[];
    installments: PolicyInstallment[];
    clauses: PolicyClause[];

    sib_contribution: string;
    camp_contribution: string;
    emission_rights: string;
    iva_percentage: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_VEHICLE: PolicyVehicle = {
    vehicle: 0,
    vehicle_number: 1,
    insured_value: '',
    net_premium: '0.00',
    general_coverage: 'auto',
    occupants: 1,
    service_vehicle: false,
    tracking_device: false,
    installation: false,
    destination_zone: '',
    activity: '',
    coverages: [],
    deductibles: [],
};

const SIB_RATE = 0.035;        
const CAMP_RATE = 0.005;       
const EMISSION_RIGHTS_FIXED = '9.00'; 
const IVA_PERCENTAGE_FIXED = '15.00'; 

function computeSib(netPremium: string): string {
    const net = Number.parseFloat(netPremium) || 0;
    return (net * SIB_RATE).toFixed(2);
}

function computeCamp(netPremium: string): string {
    const net = Number.parseFloat(netPremium) || 0;
    return (net * CAMP_RATE).toFixed(2);
}

const EMPTY_FORM: PolicyFormState = {
    insurer: 0,
    insured_customer: 0,
    policy_number: '',
    policy_type: 'individual',
    document_type: 'new',
    annex_number: '',
    renewal_number: 0,
    affected_document: '',
    cover_number: '',
    agent: '',
    branch: '',
    currency: 'USD',
    valid_from: TODAY,
    valid_until: '',
    net_premium: '',
    sib_contribution: '0.00',
    camp_contribution: '0.00',
    emission_rights: EMISSION_RIGHTS_FIXED,
    financing_charges: '0.00',
    iva_percentage: IVA_PERCENTAGE_FIXED,
    payment_method: 'cash',
    status: 'draft',
    issue_date: TODAY,
    vehicles: [{ ...EMPTY_VEHICLE }],
    installments: [],
    clauses: [],
};

const STATUS_LABELS: Record<PolicyStatus, string> = {
    draft: 'Borrador',
    sent_to_insurer: 'Enviada a aseguradora',
    pending_document: 'Pendiente de documento',
    active: 'Activa',
    expired: 'Vencida',
    cancelled: 'Cancelada',
};

const POLICY_TYPE_OPTIONS: Array<{ value: PolicyType; label: string }> = [
    { value: 'individual', label: 'Individual' },
    { value: 'fleet', label: 'Flota' },
];

const DOCUMENT_TYPE_OPTIONS: Array<{ value: PolicyDocumentType; label: string }> = [
    { value: 'new', label: 'Nueva' },
    { value: 'renewal', label: 'Renovacion' },
    { value: 'endorsement_addition', label: 'Anexo - adicion' },
    { value: 'endorsement_inclusion', label: 'Anexo - inclusion' },
];

const GENERAL_COVERAGE_OPTIONS: Array<{ value: PolicyGeneralCoverage; label: string }> = [
    { value: 'auto', label: 'Auto' },
    { value: 'heavy_auto', label: 'Auto pesado' },
    { value: 'passenger_van_all_risk', label: 'Van pasajeros todo riesgo' },
    { value: 'other', label: 'Otra' },
];

const COVERAGE_TYPE_OPTIONS: Array<{ value: PolicyCoverageType; label: string }> = [
    { value: 'basic', label: 'Basica' },
    { value: 'additional', label: 'Adicional' },
];

const COVERAGE_NAME_OPTIONS: Array<{ value: PolicyCoverageName; label: string }> = [
    { value: 'own_damage', label: 'Daños propios' },
    { value: 'occupant_personal_accident', label: 'Acc. personales ocupantes' },
    { value: 'occupant_medical_expenses', label: 'Gastos medicos ocupantes' },
    { value: 'civil_liability', label: 'Responsabilidad civil' },
    { value: 'ambulance', label: 'Ambulancia' },
    { value: 'towing', label: 'Grua' },
    { value: 'funeral_expenses', label: 'Gastos funerarios' },
    { value: 'other', label: 'Otro' },
];

const DEDUCTIBLE_TYPE_OPTIONS: Array<{ value: PolicyDeductibleType; label: string }> = [
    { value: 'general', label: 'General' },
    { value: 'total_loss_crash', label: 'Perdida total colision' },
    { value: 'total_loss_theft', label: 'Perdida total robo' },
    { value: 'patrimonial', label: 'Patrimonial' },
    { value: 'other', label: 'Otro' },
];

const CLAUSE_TYPE_OPTIONS: Array<{ value: PolicyClauseType; label: string }> = [
    { value: 'patrimonial_driver', label: 'Conductor patrimonial' },
    { value: 'auto_restitution', label: 'Restitucion auto' },
    { value: 'plate_guarantee', label: 'Garantia de placa' },
    { value: 'civil_liability_luc', label: 'Responsabilidad civil LUC' },
    { value: 'claim_notice', label: 'Aviso de siniestro' },
    { value: 'premium_payment', label: 'Pago de prima' },
    { value: 'event_clause', label: 'Clausula de evento' },
    { value: 'other', label: 'Otro' },
];

function policyToForm(policy: Policy): PolicyFormState {
    const net = policy.net_premium || '';
    return {
        insurer: policy.insurer,
        insured_customer: policy.insured_customer,
        policy_number: policy.policy_number || '',
        policy_type: policy.policy_type,
        document_type: policy.document_type,
        annex_number: policy.annex_number || '',
        renewal_number: policy.renewal_number || 0,
        affected_document: policy.affected_document || '',
        cover_number: policy.cover_number || '',
        agent: policy.agent || '',
        branch: policy.branch || '',
        currency: policy.currency || 'USD',
        valid_from: policy.valid_from || '',
        valid_until: policy.valid_until || '',
        net_premium: net,

        sib_contribution: computeSib(net),
        camp_contribution: computeCamp(net),
        emission_rights: EMISSION_RIGHTS_FIXED,
        financing_charges: policy.financing_charges || '0.00',
        iva_percentage: IVA_PERCENTAGE_FIXED,
        payment_method: policy.payment_method || 'cash',
        status: policy.status || 'draft',
        issue_date: policy.issue_date || TODAY,
        vehicles: policy.vehicles?.length ? policy.vehicles.map(v => ({
            ...v,
            net_premium: v.net_premium || '0.00',
            coverages: v.coverages || [],
            deductibles: v.deductibles || [],
        })) : [{ ...EMPTY_VEHICLE }],
        installments: policy.installments?.map(inst => ({
            ...inst,
            paid: inst.paid ?? false,
            paid_date: inst.paid_date ?? '',
        })) || [],
        clauses: policy.clauses || [],
    };
}

function translateApiFieldError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('future')) return 'La fecha no puede ser futura.';
    if (lower.includes('valid_until') || lower.includes('posterior')) return 'La vigencia hasta debe ser posterior a vigencia desde.';
    if (lower.includes('belong') || lower.includes('pertenece')) return 'El vehículo debe pertenecer al cliente asegurado.';
    if (lower.includes('policy number required') || (lower.includes('policy number') && lower.includes('required'))) return 'El numero de poliza es requerido para activar.';
    if (lower.includes('policy document') && lower.includes('required')) return 'Debe subir el PDF de la poliza antes de activar.';
    if (lower.includes('already sent')) return 'La poliza ya fue enviada a la aseguradora.';
    if (lower.includes('executive email')) return 'La aseguradora no tiene configurado el correo del ejecutivo.';
    if (lower.includes('paid date required')) return 'Ingrese la fecha de pago.';
    if (lower.includes('paid date must be empty')) return 'Elimine la fecha de pago si la cuota no esta pagada.';
    if (lower.includes('cannot be edited while policy is draft')) return 'No se puede modificar en estado borrador.';
    if (lower.includes('required') || lower.includes('blank') || lower.includes('null')) return 'Campo requerido.';
    return message;
}

function normalizeApiFieldErrors(fieldErrors?: Record<string, string>): Record<string, string> {
    return Object.entries(fieldErrors ?? {}).reduce<Record<string, string>>((acc, [field, message]) => {
        if (['code', 'request_id', 'requestId'].includes(field)) return acc;
        if (!message) return acc;
        const translated = translateApiFieldError(message);
        if (/^vehicles($|\[|\.)/.test(field) || field.includes('coverages') || field.includes('deductibles')) {
            acc.vehicles = acc.vehicles ? `${acc.vehicles} · ${translated}` : translated;
            return acc;
        }
        if (/^installments($|\[|\.)/.test(field)) {
            acc.payment_method = acc.payment_method ? `${acc.payment_method} · ${translated}` : translated;
            acc.installments = acc.installments ? `${acc.installments} · ${translated}` : translated;
            return acc;
        }
        if (/^clauses($|\[|\.)/.test(field)) {
            acc.clauses = acc.clauses ? `${acc.clauses} · ${translated}` : translated;
            return acc;
        }
        acc[field] = translated;
        return acc;
    }, {});
}

function parseApiFieldErrors(message: string): Record<string, string> {
    const errors: Record<string, string> = {};
    const items = message.split(';').map(item => item.trim()).filter(Boolean);
    for (const item of items) {
        const separator = item.indexOf(':');
        if (separator < 0) continue;
        const field = item.slice(0, separator).trim();
        const text = item.slice(separator + 1).trim();
        if (field && text && !['detail', 'message', 'error', 'non_field_errors', 'code', 'request_id', 'requestId'].includes(field)) {
            errors[field] = translateApiFieldError(text);
        }
    }
    return errors;
}

function getTabForError(errors: Record<string, string>): TabKey {
    const fields = Object.keys(errors).filter(f => errors[f]);
    if (fields.length === 0) return 'general';
    if (fields.includes('policy_document')) return 'document';
    if (fields.some(field => ['net_premium', 'sib_contribution', 'camp_contribution', 'emission_rights', 'iva_percentage', 'financing_charges'].includes(field))) return 'values';
    if (fields.some(field => field.includes('vehicle') || field.includes('insured_value') || field === 'vehicles')) return 'vehicles';
    if (fields.some(field => field.includes('clause'))) return 'clauses';
    if (fields.some(field => field.includes('installment') || field === 'payment_method')) return 'payments';
    return 'general';
}

const FIELD_LABELS: Record<string, string> = {
    insurer: 'Aseguradora',
    insured_customer: 'Cliente asegurado',
    policy_type: 'Tipo de poliza',
    document_type: 'Tipo de documento',
    affected_document: 'Documento afectado',
    renewal_number: 'Numero de renovacion',
    valid_from: 'Vigencia desde',
    valid_until: 'Vigencia hasta',
    issue_date: 'Fecha de emision',
    branch: 'Sucursal',
    agent: 'Agente',
    currency: 'Moneda',
    policy_number: 'Numero de poliza',
    annex_number: 'Numero de anexo',
    cover_number: 'Numero de cobertura',
    net_premium: 'Prima neta',
    sib_contribution: 'Contribucion SIB',
    camp_contribution: 'Contribucion CAMP',
    emission_rights: 'Derechos de emision',
    financing_charges: 'Gastos de financiamiento',
    iva_percentage: 'IVA',
    vehicles: 'Vehiculos',
    clauses: 'Clausulas',
    payment_method: 'Metodo de pago',
    installments: 'Cuotas',
    policy_document: 'PDF de poliza',
};

function formatFieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
}

function FieldErrorSummary({ errors }: Readonly<{ errors: Record<string, string> }>) {
    const entries = Object.entries(errors).filter(([field, message]) => {
        return message && !['code', 'request_id', 'requestId'].includes(field);
    });
    if (entries.length === 0) return null;

    return (
        <ul className="field-error-summary">
            {entries.map(([field, message]) => (
                <li key={field}>
                    <strong>{formatFieldLabel(field)}:</strong> {message}
                </li>
            ))}
        </ul>
    );
}

function toNumber(value: string | undefined): number {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function isNegativeAmount(value?: string): boolean {
    if (value === undefined || value === '') return false;
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed < 0;
}

function isPositiveAmount(value?: string): boolean {
    if (value === undefined || value === '') return false;
    const parsed = Number(value);
    return !Number.isNaN(parsed) && parsed > 0;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}

function buildPayload(form: PolicyFormState): PolicyWritePayload {
    const payload = {
        insurer: form.insurer,
        insured_customer: form.insured_customer,
        ...(form.policy_number.trim() ? { policy_number: form.policy_number.trim().toUpperCase() } : {}),
        policy_type: form.policy_type,
        document_type: form.document_type,
        annex_number: form.annex_number?.trim().toUpperCase(),
        renewal_number: form.renewal_number,
        affected_document: form.affected_document?.trim().toUpperCase(),
        cover_number: form.cover_number?.trim().toUpperCase(),
        agent: form.agent?.trim().toUpperCase(),
        branch: form.branch?.trim().toUpperCase(),
        currency: form.currency.trim().toUpperCase(),
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        net_premium: form.net_premium,
        financing_charges: form.financing_charges || '0.00',
        payment_method: form.payment_method,
        issue_date: form.issue_date,
        vehicles: form.vehicles.map((vehicle, index) => ({
            ...vehicle,
            vehicle_number: Number(vehicle.vehicle_number || index + 1),
            occupants: Number(vehicle.occupants || 1),
            destination_zone: (vehicle.destination_zone || '').trim().toUpperCase(),
            activity: (vehicle.activity || '').trim().toUpperCase(),
        })),
        installments: form.installments.map(inst => ({
            ...inst,
            paid_date: inst.paid ? inst.paid_date : undefined,
        })),
        clauses: form.clauses.length ? form.clauses : undefined,
    };

    if (form.payment_method === 'cash') {
        delete (payload as Partial<PolicyWritePayload>).installments;
    }

    return payload as PolicyWritePayload;
}

export function buildActivationPatch(form: PolicyFormState): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    if (form.policy_number?.trim()) patch.policy_number = form.policy_number.trim().toUpperCase();
    if (form.annex_number?.trim()) patch.annex_number = form.annex_number.trim().toUpperCase();
    if (form.cover_number?.trim()) patch.cover_number = form.cover_number.trim().toUpperCase();
    if (form.agent?.trim()) patch.agent = form.agent.trim().toUpperCase();
    if (form.affected_document?.trim()) patch.affected_document = form.affected_document.trim().toUpperCase();
    if (form.renewal_number) patch.renewal_number = form.renewal_number;
    return patch;
}

export function validatePolicyVehicles(form: PolicyFormState): string | null {
    if (!form.vehicles.length) {
        return 'Agregue al menos un vehículo.';
    }
    const invalidVehicle = form.vehicles.find(vehicle =>
        !vehicle.vehicle
        || !isPositiveAmount(vehicle.insured_value)
        || isNegativeAmount(vehicle.net_premium)
        || !Number.isInteger(Number(vehicle.occupants))
        || Number(vehicle.occupants) < 1
        || Number(vehicle.occupants) > 100
    );
    if (invalidVehicle) {
        let reason: string;
        if (!invalidVehicle.vehicle) reason = 'vehicle=' + invalidVehicle.vehicle;
        else if (!isPositiveAmount(invalidVehicle.insured_value)) reason = 'insured_value=' + invalidVehicle.insured_value;
        else if (isNegativeAmount(invalidVehicle.net_premium)) reason = 'net_premium=' + invalidVehicle.net_premium;
        else reason = 'occupants=' + invalidVehicle.occupants;
        return `Revise vehículo, valor asegurado, prima y ocupantes. Reason: ${reason}`;
    }

    const invalidCoverage = form.vehicles.some(vehicle => vehicle.coverages.some(coverage => !isPositiveAmount(coverage.insured_amount)));
    if (invalidCoverage) return 'Las coberturas deben tener monto asegurado mayor a 0.';

    const invalidDeductible = form.vehicles.some(vehicle => vehicle.deductibles.some(deductible =>
        isNegativeAmount(deductible.percentage_on_claim)
        || isNegativeAmount(deductible.percentage_on_insured)
        || isNegativeAmount(deductible.minimum_amount)
        || Number(deductible.percentage_on_claim) > 100
        || Number(deductible.percentage_on_insured) > 100
    ));
    if (invalidDeductible) return 'Revise porcentajes y montos de deducibles.';

    return null;
}

export function validatePolicyPayments(form: PolicyFormState): string | null {
    if (form.payment_method !== 'installments') return null;
    if (form.installments.length === 0) return 'Agregue cuotas para pago en cuotas.';
    
    const invalidInstallment = form.installments.find(installment =>
        !installment.installment_number
        || !installment.due_date
        || !isPositiveAmount(installment.amount)
        || (installment.paid && !installment.paid_date)
        || (!installment.paid && Boolean(installment.paid_date))
    );
    if (invalidInstallment) return 'Revise cuotas, valor, vencimiento y fecha de pago.';
    
    return null;
}

export function validatePolicyGeneralInfo(form: PolicyFormState, TODAY: string, errors: Record<string, string>): void {
    if (!form.insurer) errors.insurer = 'Seleccione una aseguradora.';
    if (!form.insured_customer) errors.insured_customer = 'Seleccione un cliente.';
    if (!form.branch?.trim()) errors.branch = 'Ingrese la sucursal.';
    if (!form.valid_from) errors.valid_from = 'Ingrese vigencia desde.';
    if (!form.valid_until) errors.valid_until = 'Ingrese vigencia hasta.';
    if (form.valid_from && form.valid_until && form.valid_until <= form.valid_from) errors.valid_until = 'Debe ser posterior a vigencia desde.';
    if (!form.issue_date) errors.issue_date = 'Ingrese fecha de emision.';
    if (form.issue_date && form.issue_date > TODAY) errors.issue_date = 'La fecha no puede ser futura.';
    if (form.issue_date && form.valid_from && form.issue_date > form.valid_from) errors.issue_date = 'Debe ser menor o igual a la vigencia desde.';
    if (form.issue_date && form.valid_until && form.issue_date > form.valid_until) errors.issue_date = 'No puede superar a la vigencia hasta.';
}

export function validatePolicyDocumentsAndValues(form: PolicyFormState, errors: Record<string, string>): void {
    if (form.document_type === 'renewal' && !form.renewal_number) errors.renewal_number = 'Ingrese el numero de renovacion.';
    if (['endorsement_addition', 'endorsement_inclusion'].includes(form.document_type) && !form.affected_document?.trim()) errors.affected_document = 'Ingrese el documento afectado.';
    if (['net_premium', 'financing_charges'].some(key => isNegativeAmount(form[key as keyof PolicyFormState] as string))) {
        errors.net_premium = 'Los montos no pueden ser negativos.';
    }
}

export function validatePolicyForm(form: PolicyFormState, TODAY: string): Record<string, string> {
    const errors: Record<string, string> = {};
    validatePolicyGeneralInfo(form, TODAY, errors);
    validatePolicyDocumentsAndValues(form, errors);
    const vehicleError = validatePolicyVehicles(form);
    if (vehicleError) errors.vehicles = vehicleError;

    const paymentsError = validatePolicyPayments(form);
    if (paymentsError) errors.payment_method = paymentsError;
    return errors;
}

export function getPolicyWorkflowMode(
    policy: Policy | null | undefined,
    editingPolicy: Policy | null | undefined,
    viewingPolicy: Policy | null | undefined,
    createdPolicy: Policy | null | undefined,
    workflowStatus: PolicyStatus | null | undefined,
    canMutate: boolean | undefined
) {
    const isPostCreateDocumentMode = Boolean(createdPolicy) && !editingPolicy && !viewingPolicy;
    const isReadOnly = Boolean(viewingPolicy) || !canMutate;
    const effectiveStatus: PolicyStatus | null = workflowStatus ?? policy?.status ?? null;
    const isWorkflowLocked = Boolean(policy?.id) && Boolean(effectiveStatus) && effectiveStatus !== 'draft';
    const isMainFormReadOnly = isReadOnly || isWorkflowLocked;

    const isResponseMode = !isReadOnly && Boolean(policy?.id) && (effectiveStatus === 'sent_to_insurer' || effectiveStatus === 'pending_document');
    const isDraftSendMode = !isReadOnly && Boolean(editingPolicy?.id) && effectiveStatus === 'draft';
    const isActivationMode = !isReadOnly && Boolean(editingPolicy?.id) && (effectiveStatus === 'sent_to_insurer' || effectiveStatus === 'pending_document');
    const isResponseFieldReadOnly = !isResponseMode && isMainFormReadOnly;
    const showSaveButton = !isReadOnly && !isPostCreateDocumentMode && (!isWorkflowLocked || isResponseMode || isDraftSendMode || isActivationMode);
    const showPolicyNumber = Boolean(policy?.id) && effectiveStatus !== 'draft';
    
    return {
        isPostCreateDocumentMode,
        isReadOnly,
        effectiveStatus,
        isWorkflowLocked,
        isMainFormReadOnly,
        isResponseMode,
        isDraftSendMode,
        isActivationMode,
        isResponseFieldReadOnly,
        showSaveButton,
        showPolicyNumber
    };
}

export function getPolicySubmitLabel(isDraftSendMode: boolean, isSendingToInsurer: boolean, isActivationMode: boolean, isActivatingWithEmail: boolean, isSaving: boolean, isEditing: boolean) {
    if (isDraftSendMode) return isSendingToInsurer ? 'Enviando...' : 'Enviar a aseguradora';
    if (isActivationMode) return isActivatingWithEmail ? 'Activando...' : 'Activar y enviar al cliente';
    return getSaveButtonLabel(isSaving, isEditing);
}

export function handlePolicyApiError(
    err: any,
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setCurrentTab: React.Dispatch<React.SetStateAction<TabKey>>
) {
    if (err?.isGlobal) return;
    const apiErrors = Object.keys(err?.fieldErrors ?? {}).length > 0
        ? normalizeApiFieldErrors(err.fieldErrors)
        : parseApiFieldErrors(err?.message || '');
    if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        setError('Por favor, revise los campos marcados en rojo.');
        setCurrentTab(getTabForError(apiErrors));
    } else {
        const fallbackMessage = err?.message || 'No se pudo guardar la poliza.';
        setError(fallbackMessage === 'Invalid data.' ? `Error API: ${JSON.stringify(err)}` : fallbackMessage);
    }
}

export interface PolicySubmitWorkflowParams {
    form: PolicyFormState;
    editingPolicy: Policy | null | undefined;
    isDraftSendMode: boolean;
    isActivationMode: boolean;
    isResponseMode: boolean;
    policyDocument: File | null;
    setIsSendingToInsurer: (v: boolean) => void;
    setIsActivatingWithEmail: (v: boolean) => void;
    setWorkflowStatus: (v: PolicyStatus) => void;
    setCreatedPolicy: (p: Policy) => void;
    setShowDocumentPrompt: (v: boolean) => void;
    onSaveSuccess: () => void;
    onClose: () => void;
}

export async function executePolicySubmitWorkflow(params: PolicySubmitWorkflowParams) {
    const {
        form,
        editingPolicy,
        isDraftSendMode,
        isActivationMode,
        isResponseMode,
        policyDocument,
        setIsSendingToInsurer,
        setIsActivatingWithEmail,
        setWorkflowStatus,
        setCreatedPolicy,
        setShowDocumentPrompt,
        onSaveSuccess,
        onClose
    } = params;
    if (isDraftSendMode && editingPolicy?.id) {
        setIsSendingToInsurer(true);
        const { insurer: _i, insured_customer: _ic, policy_type: _pt, ...draftPatch } = buildPayload(form);
        await partialUpdatePolicy(editingPolicy.id, draftPatch);
        await sendToInsurer(editingPolicy.id);
        onSaveSuccess();
        onClose();
        return;
    }

    if (isActivationMode && editingPolicy?.id) {
        setIsActivatingWithEmail(true);
        const patch = buildActivationPatch(form);
        await partialUpdatePolicy(editingPolicy.id, patch as any);
        if (policyDocument) {
            await uploadPolicyDocument(editingPolicy.id, policyDocument);
        }
        await activateWithEmail(editingPolicy.id);
        setWorkflowStatus('active');
        onSaveSuccess();
        onClose();
    } else if (isResponseMode && editingPolicy?.id) {
        const patch = buildActivationPatch(form);
        await partialUpdatePolicy(editingPolicy.id, patch as any);
        if (policyDocument) {
            await uploadPolicyDocument(editingPolicy.id, policyDocument);
        }
    } else if (editingPolicy?.id) {
        await updatePolicy(editingPolicy.id, buildPayload(form));
        if (policyDocument) {
            await uploadPolicyDocument(editingPolicy.id, policyDocument);
        }
    } else {
        const savedPolicy = await createPolicy(buildPayload(form));
        setCreatedPolicy(savedPolicy);
        setShowDocumentPrompt(true);
    }
    onSaveSuccess();
    if (editingPolicy?.id || isResponseMode) onClose();
}

export function PolicyGeneralTab({ form, setValue, fieldErrors, isActivationMode, isMainFormReadOnly, isResponseFieldReadOnly, showPolicyNumber, loadingRelated, aseguradoras, clientes }: any) {
    if (isActivationMode) {
        return (
            <div className="form-section">
                <h3>Datos para activar</h3>
                <div className="grid-2-col">
                    <div className="form-field">
                        <label htmlFor="policy_number">Numero de poliza *</label>
                        <input id="policy_number" type="text" value={form.policy_number} onChange={e => setValue('policy_number', e.target.value)} required placeholder="Ej: POL-2026-0001" />
                        <FieldError name="policy_number" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="cover_number">Numero de cobertura</label>
                        <input id="cover_number" type="text" value={form.cover_number || ''} onChange={e => setValue('cover_number', e.target.value)} placeholder="Ej: COB-001" />
                        <FieldError name="cover_number" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="annex_number">Numero de anexo</label>
                        <input id="annex_number" type="text" value={form.annex_number || ''} onChange={e => setValue('annex_number', e.target.value)} placeholder="Ej: ANX-001" />
                        <FieldError name="annex_number" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="renewal_number">Numero de renovacion</label>
                        <input id="renewal_number" type="number" min="0" value={form.renewal_number || ''} onChange={e => setValue('renewal_number', Number(e.target.value) || 0)} placeholder="Ej: 1" />
                        <FieldError name="renewal_number" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="affected_document">Documento afectado</label>
                        <input id="affected_document" type="text" value={form.affected_document || ''} onChange={e => setValue('affected_document', e.target.value)} placeholder="Ej: POL-2025-0001" />
                        <FieldError name="affected_document" errors={fieldErrors} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="agent">Agente</label>
                        <input id="agent" type="text" value={form.agent || ''} onChange={e => setValue('agent', e.target.value)} placeholder="Ej: Maria Perez" />
                        <FieldError name="agent" errors={fieldErrors} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="form-section">
            <h3>Datos de Póliza</h3>
            <div className="grid-2-col">
                <div className="form-field">
                    <label htmlFor="insurer">Aseguradora *</label>
                    <select id="insurer" value={form.insurer} onChange={e => setValue('insurer', Number(e.target.value) || 0)} disabled={isMainFormReadOnly || loadingRelated}>
                        <option value={0}>{loadingRelated ? 'Cargando...' : 'Seleccione'}</option>
                        {aseguradoras.map((ins: any) => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
                    </select>
                    <FieldError name="insurer" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="insured_customer">Cliente asegurado *</label>
                    <select id="insured_customer" value={form.insured_customer} onChange={e => setValue('insured_customer', Number(e.target.value) || 0)} disabled={isMainFormReadOnly || loadingRelated}>
                        <option value={0}>{loadingRelated ? 'Cargando...' : 'Seleccione'}</option>
                        {clientes.map((c: any) => {
                            const prefix = c.customer_code ? `${c.customer_code} - ` : '';
                            return (
                                <option key={c.id} value={c.id}>
                                    {`${prefix}${c.first_names} ${c.last_names}`.trim()}
                                </option>
                            );
                        })}
                    </select>
                    <FieldError name="insured_customer" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="policy_type">Tipo de poliza</label>
                    <select id="policy_type" value={form.policy_type} onChange={e => setValue('policy_type', e.target.value)} disabled={isMainFormReadOnly}>
                        {POLICY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <FieldError name="policy_type" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="document_type">Tipo de documento</label>
                    <select id="document_type" value={form.document_type} onChange={e => setValue('document_type', e.target.value)} disabled={isMainFormReadOnly}>
                        {DOCUMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <FieldError name="document_type" errors={fieldErrors} />
                </div>
                {['endorsement_addition', 'endorsement_inclusion'].includes(form.document_type) && (
                    <div className="form-field">
                        <label htmlFor="affected_document">Documento afectado *</label>
                        <input id="affected_document" type="text" value={form.affected_document || ''} onChange={e => setValue('affected_document', e.target.value)} disabled={isResponseFieldReadOnly} />
                        <FieldError name="affected_document" errors={fieldErrors} />
                    </div>
                )}
                {form.document_type === 'renewal' && (
                    <div className="form-field">
                        <label htmlFor="renewal_number">Número de renovacion *</label>
                        <input id="renewal_number" type="number" min="1" value={form.renewal_number || ''} onChange={e => setValue('renewal_number', Number(e.target.value) || 0)} disabled={isResponseFieldReadOnly} />
                        <FieldError name="renewal_number" errors={fieldErrors} />
                    </div>
                )}
                <div className="form-field">
                    <label htmlFor="valid_from">Vigencia desde *</label>
                    <input id="valid_from" type="date" value={form.valid_from} onChange={e => setValue('valid_from', e.target.value)} disabled={isMainFormReadOnly} />
                    <FieldError name="valid_from" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="valid_until">Vigencia hasta *</label>
                    <input id="valid_until" type="date" value={form.valid_until} onChange={e => setValue('valid_until', e.target.value)} disabled={isMainFormReadOnly} />
                    <FieldError name="valid_until" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="issue_date">Fecha de emision *</label>
                    <input id="issue_date" type="date" max={TODAY} value={form.issue_date} onChange={e => setValue('issue_date', e.target.value)} disabled={isMainFormReadOnly} />
                    <FieldError name="issue_date" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="branch">Sucursal *</label>
                    <input id="branch" type="text" value={form.branch || ''} onChange={e => setValue('branch', e.target.value)} disabled={isMainFormReadOnly} />
                    <FieldError name="branch" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="agent">Agente</label>
                    <input id="agent" type="text" value={form.agent || ''} onChange={e => setValue('agent', e.target.value)} disabled={isResponseFieldReadOnly} />
                    <FieldError name="agent" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="currency">Moneda</label>
                    <input id="currency" type="text" value={form.currency} onChange={e => setValue('currency', e.target.value)} disabled={isMainFormReadOnly} />
                    <FieldError name="currency" errors={fieldErrors} />
                </div>
                {showPolicyNumber && (
                    <div className="form-field">
                        <label htmlFor="policy_number">Número de póliza</label>
                        <input id="policy_number" type="text" value={form.policy_number} onChange={e => setValue('policy_number', e.target.value)} disabled={isResponseFieldReadOnly} />
                        <FieldError name="policy_number" errors={fieldErrors} />
                    </div>
                )}
                <div className="form-field">
                    <label htmlFor="annex_number">Número de anexo</label>
                    <input id="annex_number" type="text" value={form.annex_number || ''} onChange={e => setValue('annex_number', e.target.value)} disabled={isResponseFieldReadOnly} />
                    <FieldError name="annex_number" errors={fieldErrors} />
                </div>
                <div className="form-field">
                    <label htmlFor="cover_number">Número de cobertura</label>
                    <input id="cover_number" type="text" value={form.cover_number || ''} onChange={e => setValue('cover_number', e.target.value)} disabled={isResponseFieldReadOnly} />
                    <FieldError name="cover_number" errors={fieldErrors} />
                </div>
            </div>
        </div>
    );
}

export function PolicyVehiclesTab({
    form,
    fieldErrors,
    isMainFormReadOnly,
    selectableVehicles,
    handlePolicyVehicleSelection,
    setPolicyVehicle,
    addVehicle,
    removeVehicle,
    addCoverage,
    removeCoverage,
    setCoverage,
    addDeductible,
    removeDeductible,
    setDeductible
}: any) {
    return (
        <div className="form-section">
            <h3>Vehiculos Asegurados</h3>
            <FieldError name="vehicles" errors={fieldErrors} />
            {form.vehicles.map((item: any, index: number) => (
                <div key={`${item.vehicle_number}-${index}`} className="policy-vehicle-block">
                    <div className="policy-vehicle-header">
                        <strong>Vehículo #{index + 1}</strong>
                        {!isMainFormReadOnly && form.vehicles.length > 1 && (
                            <button type="button" className="btn-secondary btn-sm" onClick={() => removeVehicle(index)}>Quitar vehículo</button>
                        )}
                    </div>
                    <div className="grid-2-col">
                        <div className="form-field span-2">
                            <label htmlFor={`vehicle-${index}`}>Vehículo *</label>
                            <select id={`vehicle-${index}`} value={item.vehicle} onChange={e => {
                                handlePolicyVehicleSelection(index, Number(e.target.value) || 0);
                            }}>
                                <option value={0}>{form.insured_customer ? 'Seleccione vehículo' : 'Seleccione primero un cliente'}</option>
                                {selectableVehicles.map((v: any) => <option key={v.id} value={v.id}>{`${v.license_plate} - ${v.brand} ${v.model} (${v.year})`}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label htmlFor={`insured-value-${index}`}>Valor asegurado *</label><input id={`insured-value-${index}`} type="number" min="0" step="0.01" value={item.insured_value} onChange={e => setPolicyVehicle(index, 'insured_value', e.target.value)} disabled={isMainFormReadOnly} required placeholder="Ej: 25000.00" /></div>
                        <div className="form-field"><label htmlFor={`net-premium-v-${index}`}>Prima neta</label><input id={`net-premium-v-${index}`} type="number" min="0" step="0.01" value={item.net_premium} onChange={e => setPolicyVehicle(index, 'net_premium', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: 850.00" /></div>
                        <div className="form-field">
                            <label htmlFor={`general-coverage-${index}`}>Cobertura general</label>
                            <select id={`general-coverage-${index}`} value={item.general_coverage} onChange={e => setPolicyVehicle(index, 'general_coverage', e.target.value)} disabled={isMainFormReadOnly}>
                                {GENERAL_COVERAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label htmlFor={`occupants-${index}`}>Ocupantes</label><input id={`occupants-${index}`} type="number" min="1" max="100" value={item.occupants} onChange={e => setPolicyVehicle(index, 'occupants', Number(e.target.value) || 1)} disabled={isMainFormReadOnly} placeholder="Ej: 5" /></div>
                        <div className="form-field"><label htmlFor={`destination-zone-${index}`}>Zona destino</label><input id={`destination-zone-${index}`} type="text" value={item.destination_zone} onChange={e => setPolicyVehicle(index, 'destination_zone', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: Sierra" /></div>
                        <div className="form-field"><label htmlFor={`activity-${index}`}>Actividad</label><input id={`activity-${index}`} type="text" value={item.activity} onChange={e => setPolicyVehicle(index, 'activity', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: Uso particular" /></div>
                        <div className="form-field"><label><input type="checkbox" checked={item.service_vehicle} onChange={e => setPolicyVehicle(index, 'service_vehicle', e.target.checked)} disabled={isMainFormReadOnly} /> Vehiculo de servicio</label></div>
                        <div className="form-field"><label><input type="checkbox" checked={item.tracking_device} onChange={e => setPolicyVehicle(index, 'tracking_device', e.target.checked)} disabled={isMainFormReadOnly} /> Rastreo satelital</label></div>
                        <div className="form-field"><label><input type="checkbox" checked={item.installation} onChange={e => setPolicyVehicle(index, 'installation', e.target.checked)} disabled={isMainFormReadOnly} /> Instalacion</label></div>
                    </div>

                    <div className="policy-vehicle-subsection">
                        <div className="policy-vehicle-subsection-header">
                            <span>Coberturas</span>
                            {!isMainFormReadOnly && (
                                <button type="button" className="btn-secondary btn-sm" onClick={() => addCoverage(index)}>+ Agregar cobertura</button>
                            )}
                        </div>
                        {item.coverages.length === 0 && (
                            <p className="policy-empty-sub">Sin coberturas registradas.</p>
                        )}
                        {item.coverages.length > 0 && (
                            <div className="policy-coverage-header">
                                <span>Tipo *</span><span>Cobertura *</span><span>Monto asegurado *</span>{!isMainFormReadOnly && <span />}
                            </div>
                        )}
                        {item.coverages.map((cov: any, ci: number) => (
                            <div key={cov.id || `cov-${cov.coverage_name || 'new'}-${ci}`} className="policy-coverage-row">
                                <select value={cov.coverage_type} onChange={e => setCoverage(index, ci, 'coverage_type', e.target.value)} disabled={isMainFormReadOnly}>
                                    {COVERAGE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <select value={cov.coverage_name} onChange={e => setCoverage(index, ci, 'coverage_name', e.target.value)} disabled={isMainFormReadOnly}>
                                    {COVERAGE_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <input type="number" min="0" step="0.01" value={cov.insured_amount} onChange={e => setCoverage(index, ci, 'insured_amount', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: 10000.00" />
                                {!isMainFormReadOnly && (
                                    <button type="button" className="btn-icon-remove" onClick={() => removeCoverage(index, ci)} title="Quitar cobertura">✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="policy-vehicle-subsection">
                        <div className="policy-vehicle-subsection-header">
                            <span>Deducibles</span>
                            {!isMainFormReadOnly && (
                                <button type="button" className="btn-secondary btn-sm" onClick={() => addDeductible(index)}>+ Agregar deducible</button>
                            )}
                        </div>
                        {item.deductibles.length === 0 && (
                            <p className="policy-empty-sub">Sin deducibles registrados.</p>
                        )}
                        {item.deductibles.length > 0 && (
                            <div className="policy-deductible-header">
                                <span>Tipo *</span><span>% sobre siniestro</span><span>% sobre asegurado</span><span>Monto mínimo</span>{!isMainFormReadOnly && <span />}
                            </div>
                        )}
                        {item.deductibles.map((ded: any, di: number) => (
                            <div key={ded.id || `ded-${ded.deductible_type || 'new'}-${di}`} className="policy-deductible-row">
                                <select value={ded.deductible_type} onChange={e => setDeductible(index, di, 'deductible_type', e.target.value)} disabled={isMainFormReadOnly}>
                                    {DEDUCTIBLE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <input type="number" min="0" max="100" step="0.01" value={ded.percentage_on_claim} onChange={e => setDeductible(index, di, 'percentage_on_claim', e.target.value)} disabled={isMainFormReadOnly} placeholder="0.00" />
                                <input type="number" min="0" max="100" step="0.01" value={ded.percentage_on_insured} onChange={e => setDeductible(index, di, 'percentage_on_insured', e.target.value)} disabled={isMainFormReadOnly} placeholder="0.00" />
                                <input type="number" min="0" step="0.01" value={ded.minimum_amount} onChange={e => setDeductible(index, di, 'minimum_amount', e.target.value)} disabled={isMainFormReadOnly} placeholder="0.00" />
                                {!isMainFormReadOnly && (
                                    <button type="button" className="btn-icon-remove" onClick={() => removeDeductible(index, di)} title="Quitar deducible">✕</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {!isMainFormReadOnly && (
                <div className="policy-inline-actions">
                    <button type="button" className="btn-secondary" onClick={addVehicle}>Agregar vehículo</button>
                </div>
            )}
        </div>
    );
}

export function PolicyClausesTab({ form, fieldErrors, isMainFormReadOnly, setClause, removeClause, addClause }: any) {
    return (
        <div className="form-section">
            <h3>Cláusulas</h3>
            <FieldError name="clauses" errors={fieldErrors} />
            {form.clauses.length === 0 && (
                <p className="policy-empty-sub" style={{ marginBottom: 16 }}>Sin cláusulas registradas.</p>
            )}
            {form.clauses.map((clause: any, index: number) => (
                <div key={clause.id || `clause-${clause.clause_type || 'new'}-${index}`} className="policy-clause-row">
                    <div className="form-field">
                        <label htmlFor={`clause-type-${index}`}>Tipo de cláusula *</label>
                        <select id={`clause-type-${index}`} value={clause.clause_type} onChange={e => setClause(index, 'clause_type', e.target.value)} disabled={isMainFormReadOnly}>
                            {CLAUSE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label htmlFor={`clause-desc-${index}`}>Descripcion</label>
                        <textarea id={`clause-desc-${index}`} rows={2} value={clause.description} onChange={e => setClause(index, 'description', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: Clausula adicional acordada con la aseguradora" />
                    </div>
                    {!isMainFormReadOnly && (
                        <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => removeClause(index)}>Quitar</button>
                        </div>
                    )}
                </div>
            ))}
            {!isMainFormReadOnly && (
                <div className="policy-inline-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="btn-secondary" onClick={addClause}>Agregar cláusula</button>
                </div>
            )}
        </div>
    );
}

export function PolicyPaymentsTab({ form, fieldErrors, isMainFormReadOnly, setValue, setInstallment, removeInstallment, addInstallment }: any) {
    return (
        <div className="form-section">
            <h3>Forma de Pago</h3>
            <div className="grid-2-col">
                <div className="form-field">
                    <label htmlFor="payment_method">Metodo de pago *</label>
                    <select id="payment_method" value={form.payment_method} onChange={e => setValue('payment_method', e.target.value)} disabled={isMainFormReadOnly} required>
                        <option value="cash">Contado</option>
                        <option value="installments">Cuotas</option>
                    </select>
                    <FieldError name="payment_method" errors={fieldErrors} />
                </div>
            </div>
            <FieldError name="installments" errors={fieldErrors} />
            {form.payment_method === 'installments' && (
                <>
                    {form.installments.length > 0 && (
                        <div className="policy-installment-header">
                            <span>Nro. *</span><span>Vencimiento *</span><span>Valor *</span><span>Pagada</span><span>Fecha pago</span>{!isMainFormReadOnly && <span />}
                        </div>
                    )}
                    {form.installments.map((installment: any, index: number) => (
                        <div className="policy-installment-row" key={installment.id || `inst-${installment.installment_number}-${index}`}>
                            <input type="number" min="1" value={installment.installment_number} onChange={e => setInstallment(index, 'installment_number', Number(e.target.value) || 1)} disabled={isMainFormReadOnly} placeholder="Ej: 1" />
                            <input type="date" value={installment.due_date} onChange={e => setInstallment(index, 'due_date', e.target.value)} disabled={isMainFormReadOnly} />
                            <input type="number" min="0" step="0.01" value={installment.amount} onChange={e => setInstallment(index, 'amount', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: 250.00" />
                            <label className="policy-installment-check">
                                <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Pagada</span>
                                <input type="checkbox" aria-label="Cuota pagada" checked={installment.paid} onChange={e => setInstallment(index, 'paid', e.target.checked)} disabled={isMainFormReadOnly} />
                            </label>
                            <input type="date" max={TODAY} value={installment.paid_date || ''} onChange={e => setInstallment(index, 'paid_date', e.target.value)} disabled={isMainFormReadOnly || !installment.paid} />
                            {!isMainFormReadOnly && (
                                <button type="button" className="btn-icon-remove" onClick={() => removeInstallment(index)} title="Quitar cuota">✕</button>
                            )}
                        </div>
                    ))}
                    {!isMainFormReadOnly && (
                        <div className="policy-inline-actions" style={{ marginTop: 12 }}>
                            <button type="button" className="btn-secondary" onClick={addInstallment}>Agregar cuota</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function usePolicyFormActions(
    setForm: React.Dispatch<React.SetStateAction<PolicyFormState>>,
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    vehiculos: Vehiculo[]
) {
    const setValue = (field: keyof PolicyFormState, value: unknown) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'net_premium') {
                const net = String(value);
                updated.sib_contribution = computeSib(net);
                updated.camp_contribution = computeCamp(net);
                updated.emission_rights = EMISSION_RIGHTS_FIXED;
                updated.iva_percentage = IVA_PERCENTAGE_FIXED;
            }
            return updated;
        });
        setFieldErrors(prev => {
            if (prev[field]) return { ...prev, [field]: '' };
            return prev;
        });
    };

    const setPolicyVehicle = (index: number, field: keyof PolicyVehicle, value: unknown) => {
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            if (nextVehicles[index]) {
                nextVehicles[index] = { ...nextVehicles[index], [field]: value };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const handlePolicyVehicleSelection = (index: number, vehicleId: number) => {
        const selectedVehicle = vehiculos.find(v => v.id === vehicleId);
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            if (nextVehicles[index]) {
                nextVehicles[index] = {
                    ...nextVehicles[index],
                    vehicle: vehicleId,
                    insured_value: nextVehicles[index].insured_value || selectedVehicle?.commercial_value || '',
                    occupants: nextVehicles[index].occupants || 1,
                };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const addVehicle = () => {
        setForm(prev => ({
            ...prev,
            vehicles: [...prev.vehicles, { ...EMPTY_VEHICLE, vehicle_number: prev.vehicles.length + 1 }],
        }));
    };

    const removeVehicle = (index: number) => {
        setForm(prev => ({ ...prev, vehicles: prev.vehicles.filter((_, i) => i !== index) }));
    };

    const addCoverage = (vehicleIndex: number) => {
        const newCoverage: PolicyCoverage = { coverage_type: 'basic', coverage_name: 'own_damage', insured_amount: '' };
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            if (nextVehicles[vehicleIndex]) {
                nextVehicles[vehicleIndex] = {
                    ...nextVehicles[vehicleIndex],
                    coverages: [...nextVehicles[vehicleIndex].coverages, newCoverage]
                };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const removeCoverage = (vehicleIndex: number, ci: number) => {
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            const vehicle = nextVehicles[vehicleIndex];
            if (vehicle) {
                const nextCoverages = [...vehicle.coverages];
                nextCoverages.splice(ci, 1);
                nextVehicles[vehicleIndex] = { ...vehicle, coverages: nextCoverages };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const setCoverage = (vehicleIndex: number, ci: number, field: keyof PolicyCoverage, value: unknown) => {
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            const vehicle = nextVehicles[vehicleIndex];
            if (vehicle) {
                const nextCoverages = [...vehicle.coverages];
                if (nextCoverages[ci]) {
                    nextCoverages[ci] = { ...nextCoverages[ci], [field]: value };
                    nextVehicles[vehicleIndex] = { ...vehicle, coverages: nextCoverages };
                }
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const addDeductible = (vehicleIndex: number) => {
        const newDeductible: PolicyDeductible = { deductible_type: 'general', percentage_on_claim: '0.00', percentage_on_insured: '0.00', minimum_amount: '0.00' };
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            if (nextVehicles[vehicleIndex]) {
                nextVehicles[vehicleIndex] = {
                    ...nextVehicles[vehicleIndex],
                    deductibles: [...nextVehicles[vehicleIndex].deductibles, newDeductible]
                };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const removeDeductible = (vehicleIndex: number, di: number) => {
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            const vehicle = nextVehicles[vehicleIndex];
            if (vehicle) {
                const nextDeductibles = [...vehicle.deductibles];
                nextDeductibles.splice(di, 1);
                nextVehicles[vehicleIndex] = { ...vehicle, deductibles: nextDeductibles };
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const setDeductible = (vehicleIndex: number, di: number, field: keyof PolicyDeductible, value: unknown) => {
        setForm(prev => {
            const nextVehicles = [...prev.vehicles];
            const vehicle = nextVehicles[vehicleIndex];
            if (vehicle) {
                const nextDeductibles = [...vehicle.deductibles];
                if (nextDeductibles[di]) {
                    nextDeductibles[di] = { ...nextDeductibles[di], [field]: value };
                    nextVehicles[vehicleIndex] = { ...vehicle, deductibles: nextDeductibles };
                }
            }
            return { ...prev, vehicles: nextVehicles };
        });
    };

    const addClause = () => {
        setForm(prev => ({
            ...prev,
            clauses: [...prev.clauses, { clause_type: 'premium_payment', description: '' }],
        }));
    };

    const removeClause = (index: number) => {
        setForm(prev => ({ ...prev, clauses: prev.clauses.filter((_, i) => i !== index) }));
    };

    const setClause = (index: number, field: keyof PolicyClause, value: unknown) => {
        setForm(prev => {
            const nextClauses = [...prev.clauses];
            if (nextClauses[index]) {
                nextClauses[index] = { ...nextClauses[index], [field]: value };
            }
            return { ...prev, clauses: nextClauses };
        });
    };

    const addInstallment = () => {
        setFieldErrors(prev => ({ ...prev, payment_method: '', installments: '' }));
        setForm(prev => ({
            ...prev,
            installments: [...prev.installments, { installment_number: prev.installments.length + 1, due_date: '', amount: '', paid: false, paid_date: '' }],
        }));
    };

    const setInstallment = (index: number, field: keyof PolicyInstallment, value: unknown) => {
        setFieldErrors(prev => ({ ...prev, payment_method: '', installments: '' }));
        setForm(prev => {
            const nextInstallments = [...prev.installments];
            if (nextInstallments[index]) {
                const updated = { ...nextInstallments[index], [field]: value };
                if (field === 'paid' && !value) updated.paid_date = '';
                nextInstallments[index] = updated;
            }
            return { ...prev, installments: nextInstallments };
        });
    };

    const removeInstallment = (index: number) => {
        setForm(prev => ({ ...prev, installments: prev.installments.filter((_, i) => i !== index) }));
    };

    return {
        setValue, setPolicyVehicle, handlePolicyVehicleSelection,
        addVehicle, removeVehicle, addCoverage, removeCoverage, setCoverage,
        addDeductible, removeDeductible, setDeductible,
        addClause, removeClause, setClause,
        addInstallment, setInstallment, removeInstallment
    };
}

export function usePolicyModalState(isOpen: boolean, editingPolicy: Policy | null | undefined, viewingPolicy: Policy | null | undefined) {
    const [form, setForm] = useState<PolicyFormState>({ ...EMPTY_FORM });
    const [currentTab, setCurrentTab] = useState<TabKey>('general');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [policyDocument, setPolicyDocument] = useState<File | null>(null);
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);
    const [documentMessage, setDocumentMessage] = useState<string | null>(null);
    const [createdPolicy, setCreatedPolicy] = useState<Policy | null>(null);
    const [showDocumentPrompt, setShowDocumentPrompt] = useState(false);

    const [workflowStatus, setWorkflowStatus] = useState<PolicyStatus | null>(null);
    const [isSendingToInsurer, setIsSendingToInsurer] = useState(false);
    const [isActivatingWithEmail, setIsActivatingWithEmail] = useState(false);
    const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
    const [isSendingToClient, setIsSendingToClient] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCurrentTab('general');
        setFieldErrors({});
        setError(null);
        setPolicyDocument(null);
        setDocumentMessage(null);
        setCreatedPolicy(null);
        setShowDocumentPrompt(false);
        setWorkflowStatus(null);
        setWorkflowMessage(null);
        setIsSendingToClient(false);
        const base = editingPolicy || viewingPolicy;
        setForm(base ? policyToForm(base) : { ...EMPTY_FORM, vehicles: [{ ...EMPTY_VEHICLE }], installments: [], clauses: [] });
    }, [isOpen, editingPolicy, viewingPolicy]);

    useEffect(() => {
        if (!isOpen) return;
        setLoadingRelated(true);
        Promise.all([
            getClientes({ is_active: true, page_size: 100 }),
            getVehiculos({ page_size: 200 }),
            getAseguradoras({ is_active: true, page_size: 100 }),
        ])
            .then(([customers, vehicles, insurers]) => {
                setClientes(customers);
                setVehiculos(vehicles);
                setAseguradoras(insurers);
            })
            .catch(() => {
                setClientes([]);
                setVehiculos([]);
                setAseguradoras([]);
            })
            .finally(() => setLoadingRelated(false));
    }, [isOpen]);

    return {
        form, setForm, currentTab, setCurrentTab, fieldErrors, setFieldErrors,
        error, setError, isSaving, setIsSaving, clientes, vehiculos, aseguradoras,
        loadingRelated, policyDocument, setPolicyDocument, isUploadingDocument, setIsUploadingDocument,
        documentMessage, setDocumentMessage, createdPolicy, setCreatedPolicy,
        showDocumentPrompt, setShowDocumentPrompt, workflowStatus, setWorkflowStatus,
        isSendingToInsurer, setIsSendingToInsurer, isActivatingWithEmail, setIsActivatingWithEmail,
        workflowMessage, setWorkflowMessage, isSendingToClient, setIsSendingToClient
    };
}

interface PolicyCalculationParams {
    form: PolicyFormState;
    vehiculos: Vehiculo[];
    editingPolicy: Policy | null | undefined;
    viewingPolicy: Policy | null | undefined;
    createdPolicy: Policy | null;
    workflowStatus: PolicyStatus | null;
    canMutate: boolean;
    isSaving: boolean;
    isSendingToInsurer: boolean;
    isActivatingWithEmail: boolean;
}

export function usePolicyCalculations({
    form, vehiculos, editingPolicy, viewingPolicy, createdPolicy, 
    workflowStatus, canMutate, isSaving, isSendingToInsurer, isActivatingWithEmail
}: PolicyCalculationParams) {
    const policy = editingPolicy || viewingPolicy || createdPolicy || null;
    const workflowMode = getPolicyWorkflowMode(policy, editingPolicy, viewingPolicy, createdPolicy, workflowStatus, canMutate);
    
    const initialForm = useMemo(() => (editingPolicy ? policyToForm(editingPolicy) : null), [editingPolicy]);
    const hasChanges = !editingPolicy?.id || (initialForm ? isFormDirty(form, initialForm) : true);
    const submitLabel = getPolicySubmitLabel(workflowMode.isDraftSendMode, isSendingToInsurer, workflowMode.isActivationMode, isActivatingWithEmail, isSaving, Boolean(editingPolicy?.id));
    const isSubmitDisabled = isSaving || isSendingToInsurer || isActivatingWithEmail || (Boolean(editingPolicy?.id) && !hasChanges && !workflowMode.isDraftSendMode && !workflowMode.isActivationMode);

    const assignedVehicleIds = new Set(form.vehicles.map(v => v.vehicle).filter(Boolean));
    const selectableVehicles = vehiculos.filter(vehicle =>
        (vehicle.owner_customer === form.insured_customer && vehicle.is_active !== false)
        || assignedVehicleIds.has(vehicle.id)
    );
    const totalInsuredValue = form.vehicles.reduce((sum, vehicle) => sum + toNumber(vehicle.insured_value), 0);
    const taxableBase = ['net_premium', 'sib_contribution', 'camp_contribution', 'emission_rights'].reduce(
        (sum, key) => sum + toNumber(form[key as keyof PolicyFormState] as string),
        0,
    );
    const ivaAmount = taxableBase * (toNumber(form.iva_percentage) / 100);
    const totalAmount = taxableBase + ivaAmount;

    return {
        policy, workflowMode, submitLabel, isSubmitDisabled, selectableVehicles,
        totalInsuredValue, taxableBase, totalAmount
    };
}

export function PolicyValuesTab({ form, setValue, isMainFormReadOnly, totalInsuredValue, taxableBase, totalAmount }: any) {
    return (
        <div className="form-section">
            <h3>Valores</h3>
            <div className="grid-2-col">
                <div className="form-field"><label htmlFor="net_premium">Prima neta *</label><input id="net_premium" type="number" min="0" step="0.01" value={form.net_premium} onChange={e => setValue('net_premium', e.target.value)} disabled={isMainFormReadOnly} /></div>
                <div className="form-field">
                    <label htmlFor="sib_contribution">Contribucion SIB</label>
                    <input id="sib_contribution" type="text" readOnly value={`$${form.sib_contribution}`} className="input-fixed-value" />
                </div>
                <div className="form-field">
                    <label htmlFor="camp_contribution">Contribucion CAMP</label>
                    <input id="camp_contribution" type="text" readOnly value={`$${form.camp_contribution}`} className="input-fixed-value" />
                </div>
                <div className="form-field">
                    <label htmlFor="emission_rights">Derechos de emision</label>
                    <input id="emission_rights" type="text" readOnly value="$9.00" className="input-fixed-value" />
                </div>
                <div className="form-field"><label htmlFor="financing_charges">Gastos de financiamiento</label><input id="financing_charges" type="number" min="0" step="0.01" value={form.financing_charges || ''} onChange={e => setValue('financing_charges', e.target.value)} disabled={isMainFormReadOnly} placeholder="Ej: 0.00" /></div>
                <div className="form-field">
                    <label htmlFor="iva_percentage">IVA</label>
                    <input id="iva_percentage" type="text" readOnly value="15.00 %" className="input-fixed-value" />
                </div>
            </div>
            <div className="policy-summary-grid">
                <div className="policy-summary-item"><span>Valor asegurado total</span><strong>{formatCurrency(totalInsuredValue)}</strong></div>
                <div className="policy-summary-item"><span>Base imponible</span><strong>{formatCurrency(taxableBase)}</strong></div>
                <div className="policy-summary-item"><span>Total estimado</span><strong>{formatCurrency(totalAmount)}</strong></div>
            </div>
        </div>
    );
}

export function PolicyDocumentTab({ isReadOnly, policyDocument, setPolicyDocument, isUploadingDocument, openPolicyDocument, onUploadDocument, documentMessage, fieldErrors, FieldError }: any) {
    return (
        <div className="form-section">
            <h3>Documento de Póliza</h3>
            {isReadOnly ? (
                <div className="form-field">
                    <span style={{ display: 'inline-block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Documento actual</span>
                    <button type="button" className="btn-secondary" onClick={openPolicyDocument}>Ver PDF</button>
                </div>
            ) : (
                <>
                    <div className="grid-2-col">
                        <div className="form-field">
                            <label htmlFor="policy_document">PDF de poliza</label>
                            <input
                                id="policy_document"
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={e => setPolicyDocument(e.target.files?.[0] ?? null)}
                                disabled={isUploadingDocument}
                            />
                            {FieldError && <FieldError name="policy_document" errors={fieldErrors} />}
                        </div>
                        <div className="form-field">
                            <span style={{ display: 'inline-block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Documento actual</span>
                            <div className="policy-inline-actions">
                                <button type="button" className="btn-secondary" onClick={openPolicyDocument}>Ver PDF</button>
                                <button type="button" className="btn-primary" disabled={!policyDocument || isUploadingDocument} onClick={onUploadDocument}>
                                    {isUploadingDocument ? 'Subiendo...' : 'Subir/Reemplazar'}
                                </button>
                            </div>
                        </div>
                    </div>
                    {documentMessage ? <div className="form-helper-text">{documentMessage}</div> : null}
                </>
            )}
        </div>
    );
}

export function PolicyModalTabs({ currentTab, setCurrentTab, isActivationMode, policy, effectiveStatus }: any) {
    return (
        <div className="modal-tabs">
            <button type="button" className={`tab-btn ${currentTab === 'general' ? 'active' : ''}`} onClick={() => setCurrentTab('general')}>Informacion General</button>
            {!isActivationMode && <button type="button" className={`tab-btn ${currentTab === 'values' ? 'active' : ''}`} onClick={() => setCurrentTab('values')}>Valores</button>}
            {!isActivationMode && <button type="button" className={`tab-btn ${currentTab === 'vehicles' ? 'active' : ''}`} onClick={() => setCurrentTab('vehicles')}>Vehiculos</button>}
            {!isActivationMode && <button type="button" className={`tab-btn ${currentTab === 'clauses' ? 'active' : ''}`} onClick={() => setCurrentTab('clauses')}>Clausulas</button>}
            {!isActivationMode && <button type="button" className={`tab-btn ${currentTab === 'payments' ? 'active' : ''}`} onClick={() => setCurrentTab('payments')}>Pagos</button>}
            {policy?.id && effectiveStatus !== 'draft' ? <button type="button" className={`tab-btn ${currentTab === 'document' ? 'active' : ''}`} onClick={() => setCurrentTab('document')}>Documento</button> : null}
        </div>
    );
}

export function PolicyWorkflowAlerts({ error, fieldErrors, effectiveStatus, policyId, workflowMessage, STATUS_LABELS, FieldErrorSummary }: any) {
    return (
        <>
            {error ? (
                <div className="action-error" role="alert" style={{ margin: '0 30px 16px' }}>
                    <div>{error}</div>
                    <FieldErrorSummary errors={fieldErrors} />
                </div>
            ) : null}
            {effectiveStatus && policyId ? (
                <div className="policy-workflow-bar">
                    <div className="policy-workflow-status">
                        <span className="policy-workflow-label">Estado:</span>
                        <span className={`policy-status-badge policy-status-badge--${effectiveStatus}`}>{STATUS_LABELS[effectiveStatus]}</span>
                    </div>
                    {workflowMessage ? <div className="policy-workflow-message">{workflowMessage}</div> : null}
                </div>
            ) : null}
        </>
    );
}

export function PolicyModalActions({ onClose, isWorkflowLocked, isReadOnly, onOpenEdit, policy, showSaveButton, isSubmitDisabled, submitLabel, isSendingToClient, onSendToClient }: any) {
    const closeLabel = (isWorkflowLocked || isReadOnly) ? 'Cerrar' : 'Cancelar';
    
    return (
        <div className="modal-actions-fixed">
            <button type="button" className="btn-secondary" onClick={onClose}>{closeLabel}</button>
            {isReadOnly && onOpenEdit && policy && ['draft', 'sent_to_insurer', 'pending_document'].includes(String(policy.status).toLowerCase().trim()) && (
                <button type="button" className="btn-primary" onClick={() => { onOpenEdit(policy); }}>
                    {String(policy.status).toLowerCase().trim() === 'draft' ? 'Editar' : 'Completar / Activar'}
                </button>
            )}
            {policy?.id && String(policy.status).toLowerCase().trim() === 'active' && (
                <button type="button" className="btn-secondary" disabled={isSendingToClient} onClick={onSendToClient}>
                    {isSendingToClient ? 'Enviando...' : 'Enviar a cliente'}
                </button>
            )}
            {showSaveButton && (
                <button type="submit" className="btn-primary" disabled={isSubmitDisabled}>
                    {submitLabel}
                </button>
            )}
        </div>
    );
}

export default function PolicyFormModal({ isOpen, onClose, onSaveSuccess, editingPolicy, viewingPolicy, canMutate, onOpenEdit }: Props) {
    const s = usePolicyModalState(isOpen, editingPolicy, viewingPolicy);
    const form = s.form;

    const calc = usePolicyCalculations({
        form, 
        vehiculos: s.vehiculos, 
        editingPolicy, 
        viewingPolicy, 
        createdPolicy: s.createdPolicy, 
        workflowStatus: s.workflowStatus, 
        canMutate, 
        isSaving: s.isSaving, 
        isSendingToInsurer: s.isSendingToInsurer, 
        isActivatingWithEmail: s.isActivatingWithEmail
    });

    const {
        isPostCreateDocumentMode, isReadOnly, effectiveStatus, isWorkflowLocked,
        isMainFormReadOnly, isResponseMode, isDraftSendMode, isActivationMode,
        isResponseFieldReadOnly, showSaveButton, showPolicyNumber
    } = calc.workflowMode;

    const policy = calc.policy;

    useEffect(() => {
        if (isActivationMode && !['general', 'document'].includes(s.currentTab)) {
            s.setCurrentTab('general');
        }
    }, [isActivationMode, s.currentTab]);

    const {
        setValue, setPolicyVehicle, handlePolicyVehicleSelection,
        addVehicle, removeVehicle, addCoverage, removeCoverage, setCoverage,
        addDeductible, removeDeductible, setDeductible,
        addClause, removeClause, setClause,
        addInstallment, setInstallment, removeInstallment
    } = usePolicyFormActions(s.setForm, s.setFieldErrors, s.vehiculos);

    if (!isOpen) return null;

    const openPolicyDocument = async () => {
        if (!policy?.id) return;
        s.setDocumentMessage(null);
        try {
            const url = await getPolicyDocumentUrl(policy.id);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            if (err?.isGlobal) return;
            s.setDocumentMessage(err?.status === 404 ? 'La poliza aun no tiene documento cargado.' : err?.message || 'No se pudo obtener el documento.');
        }
    };

    const onUploadDocument = async () => {
        if (!policy?.id || !s.policyDocument) return;
        s.setIsUploadingDocument(true);
        s.setDocumentMessage(null);
        try {
            await uploadPolicyDocument(policy.id, s.policyDocument);
            s.setPolicyDocument(null);
            s.setDocumentMessage('Documento de poliza actualizado correctamente.');
            onSaveSuccess();
            if (isPostCreateDocumentMode) onClose();
        } catch (err: any) {
            if (err?.isGlobal) return;
            s.setDocumentMessage(err?.message || 'No se pudo subir el documento de poliza.');
        } finally {
            s.setIsUploadingDocument(false);
        }
    };

    const onSendToClient = async () => {
        if (!policy?.id) return;
        s.setIsSendingToClient(true);
        s.setWorkflowMessage(null);
        try {
            await activateWithEmail(policy.id);
            s.setWorkflowMessage('Poliza enviada al cliente exitosamente.');
        } catch (err: any) {
            if (err?.isGlobal) return;
            s.setWorkflowMessage(err?.message || 'No se pudo enviar la poliza al cliente.');
        } finally {
            s.setIsSendingToClient(false);
        }
    };

    const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isReadOnly) { onClose(); return; }

        if (!isResponseMode && !isDraftSendMode) {
            const errors = validatePolicyForm(form, TODAY);
            if (Object.keys(errors).length > 0) {
                s.setFieldErrors(errors);
                s.setError('Por favor, revise los campos marcados en rojo.');
                s.setCurrentTab(getTabForError(errors));
                return;
            }
        }

        s.setIsSaving(true);
        s.setError(null);
        try {
            await executePolicySubmitWorkflow({
                form, editingPolicy, isDraftSendMode, isActivationMode, isResponseMode, policyDocument: s.policyDocument,
                setIsSendingToInsurer: s.setIsSendingToInsurer, setIsActivatingWithEmail: s.setIsActivatingWithEmail, 
                setWorkflowStatus: s.setWorkflowStatus, setCreatedPolicy: s.setCreatedPolicy, setShowDocumentPrompt: s.setShowDocumentPrompt, 
                onSaveSuccess, onClose
            });
        } catch (err: any) {
            handlePolicyApiError(err, s.setFieldErrors, s.setError, s.setCurrentTab);
        } finally {
            s.setIsSaving(false);
            s.setIsSendingToInsurer(false);
            s.setIsActivatingWithEmail(false);
        }
    };

    let title = 'Registrar Póliza';
    if (viewingPolicy) {
        title = 'Detalles de Póliza';
    } else if (editingPolicy) {
        title = 'Actualizar Póliza';
    } else if (isPostCreateDocumentMode) {
        title = 'Póliza Creada';
    }

    return (
        <div className="modal-overlay">
            <div className="modal-box policy-modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <PolicyModalTabs 
                    currentTab={s.currentTab} 
                    setCurrentTab={s.setCurrentTab} 
                    isActivationMode={isActivationMode} 
                    policy={policy} 
                    effectiveStatus={effectiveStatus} 
                />

                <PolicyWorkflowAlerts 
                    error={s.error} 
                    fieldErrors={s.fieldErrors} 
                    effectiveStatus={effectiveStatus} 
                    policyId={policy?.id} 
                    workflowMessage={s.workflowMessage} 
                    STATUS_LABELS={STATUS_LABELS} 
                    FieldErrorSummary={FieldErrorSummary} 
                />

                <form className="modal-body-scroll" onSubmit={onSubmit} noValidate>

                    {}
                    {s.currentTab === 'general' && (
                        <div className="form-grid">
                            <PolicyGeneralTab
                                form={form}
                                setValue={setValue}
                                fieldErrors={s.fieldErrors}
                                isActivationMode={isActivationMode}
                                isMainFormReadOnly={isMainFormReadOnly}
                                isResponseFieldReadOnly={isResponseFieldReadOnly}
                                showPolicyNumber={showPolicyNumber}
                                loadingRelated={s.loadingRelated}
                                aseguradoras={s.aseguradoras}
                                clientes={s.clientes}
                            />
                        </div>
                    )}

                    {}
                    {s.currentTab === 'values' && (
                        <div className="form-grid">
                            <PolicyValuesTab
                                form={form}
                                setValue={setValue}
                                isMainFormReadOnly={isMainFormReadOnly}
                                totalInsuredValue={calc.totalInsuredValue}
                                taxableBase={calc.taxableBase}
                                totalAmount={calc.totalAmount}
                            />
                        </div>
                    )}

                    {}
                    {s.currentTab === 'vehicles' && (
                        <div className="form-grid">
                            <PolicyVehiclesTab
                                form={form}
                                fieldErrors={s.fieldErrors}
                                isMainFormReadOnly={isMainFormReadOnly}
                                selectableVehicles={calc.selectableVehicles}
                                handlePolicyVehicleSelection={handlePolicyVehicleSelection}
                                setPolicyVehicle={setPolicyVehicle}
                                addVehicle={addVehicle}
                                removeVehicle={removeVehicle}
                                addCoverage={addCoverage}
                                removeCoverage={removeCoverage}
                                setCoverage={setCoverage}
                                addDeductible={addDeductible}
                                removeDeductible={removeDeductible}
                                setDeductible={setDeductible}
                            />
                        </div>
                    )}

                    {s.currentTab === 'clauses' && (
                        <div className="form-grid">
                            <PolicyClausesTab
                                form={form}
                                fieldErrors={s.fieldErrors}
                                isMainFormReadOnly={isMainFormReadOnly}
                                setClause={setClause}
                                removeClause={removeClause}
                                addClause={addClause}
                            />
                        </div>
                    )}

                    {}
                    {s.currentTab === 'payments' && (
                        <div className="form-grid">
                            <PolicyPaymentsTab
                                form={form}
                                fieldErrors={s.fieldErrors}
                                isMainFormReadOnly={isMainFormReadOnly}
                                setValue={setValue}
                                setInstallment={setInstallment}
                                removeInstallment={removeInstallment}
                                addInstallment={addInstallment}
                            />
                        </div>
                    )}

                    {}
                    {s.currentTab === 'document' && policy?.id && effectiveStatus !== 'draft' && (
                        <div className="form-grid">
                            <PolicyDocumentTab
                                isReadOnly={isReadOnly}
                                policyDocument={s.policyDocument}
                                setPolicyDocument={s.setPolicyDocument}
                                isUploadingDocument={s.isUploadingDocument}
                                openPolicyDocument={openPolicyDocument}
                                onUploadDocument={onUploadDocument}
                                documentMessage={s.documentMessage}
                                fieldErrors={s.fieldErrors}
                                FieldError={FieldError}
                            />
                        </div>
                    )}

                    <PolicyModalActions 
                        onClose={onClose} 
                        isWorkflowLocked={isWorkflowLocked} 
                        isReadOnly={isReadOnly} 
                        onOpenEdit={onOpenEdit} 
                        policy={policy} 
                        showSaveButton={showSaveButton} 
                        isSubmitDisabled={calc.isSubmitDisabled} 
                        submitLabel={calc.submitLabel} 
                        isSendingToClient={s.isSendingToClient}
                        onSendToClient={onSendToClient}
                    />
                </form>

                <ConfirmDialog
                    isOpen={s.showDocumentPrompt}
                    title="Subir PDF de poliza"
                    message="La poliza se creo correctamente. Deseas subir el documento PDF ahora?"
                    confirmLabel="Subir ahora"
                    cancelLabel="Subir luego"
                    variant="info"
                    onCancel={() => { s.setShowDocumentPrompt(false); onClose(); }}
                    onConfirm={() => {
                        s.setShowDocumentPrompt(false);
                        s.setCurrentTab('document');
                        s.setDocumentMessage('Selecciona el PDF de la poliza para subirlo al expediente.');
                    }}
                />
            </div>
        </div>
    );
}