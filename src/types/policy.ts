export type PolicyStatus = 'draft' | 'sent_to_insurer' | 'pending_document' | 'active' | 'expired' | 'cancelled';
export type PolicyType = 'individual' | 'fleet';
export type PolicyDocumentType = 'new' | 'renewal' | 'endorsement_addition' | 'endorsement_inclusion';
export type PolicyPaymentMethod = 'cash' | 'installments';
export type PolicyGeneralCoverage = 'auto' | 'heavy_auto' | 'passenger_van_all_risk' | 'other';
export type PolicyCoverageType = 'basic' | 'additional';
export type PolicyCoverageName = 'own_damage' | 'occupant_personal_accident' | 'occupant_medical_expenses' | 'civil_liability' | 'ambulance' | 'towing' | 'funeral_expenses' | 'other';
export type PolicyDeductibleType = 'general' | 'total_loss_crash' | 'total_loss_theft' | 'patrimonial' | 'other';
export type PolicyClauseType = 'patrimonial_driver' | 'auto_restitution' | 'plate_guarantee' | 'civil_liability_luc' | 'claim_notice' | 'premium_payment' | 'event_clause' | 'other';

export interface PolicyCoverage {
    id?: number;
    coverage_type: PolicyCoverageType;
    coverage_name: PolicyCoverageName;
    insured_amount: string;
}

export interface PolicyDeductible {
    id?: number;
    deductible_type: PolicyDeductibleType;
    percentage_on_claim: string;
    percentage_on_insured: string;
    minimum_amount: string;
}

export interface PolicyClause {
    id?: number;
    clause_type: PolicyClauseType;
    description: string;
}

export interface PolicyVehicle {
    id?: number;
    vehicle: number;
    vehicle_number: number;
    insured_value: string;
    net_premium: string;
    general_coverage: PolicyGeneralCoverage;
    occupants: number;
    service_vehicle: boolean;
    tracking_device: boolean;
    installation: boolean;
    destination_zone: string;
    activity: string;
    coverages: PolicyCoverage[];
    deductibles: PolicyDeductible[];
}

export interface PolicyInstallment {
    id?: number;
    installment_number: number;
    due_date: string;
    amount: string;
    paid: boolean;
    paid_date?: string;
}

export interface Policy {
    id: number;
    insurer: number;
    insured_customer: number;
    policy_number: string;
    policy_type: PolicyType;
    document_type: PolicyDocumentType;
    annex_number?: string;
    renewal_number?: number;
    affected_document?: string;
    cover_number?: string;
    agent?: string;
    branch?: string;
    currency: string;
    valid_from: string;
    valid_until: string;
    net_premium: string;
    sib_contribution: string;
    camp_contribution: string;
    emission_rights: string;
    financing_charges: string;
    iva_percentage: string;
    payment_method: PolicyPaymentMethod;
    status: PolicyStatus;
    issue_date: string;
    duration_days?: number;
    total_insured_value?: string;
    taxable_base?: string;
    iva_amount?: string;
    total_amount?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    vehicles: PolicyVehicle[];
    installments?: PolicyInstallment[];
    clauses?: PolicyClause[];
    policy_document?: string | null;
    quote?: number | null;
}

export interface PolicyWritePayload {
    insurer: number;
    insured_customer: number;
    policy_number: string;
    policy_type: PolicyType;
    document_type: PolicyDocumentType;
    annex_number?: string;
    renewal_number?: number;
    affected_document?: string;
    cover_number?: string;
    agent?: string;
    branch: string;
    currency: string;
    valid_from: string;
    valid_until: string;
    net_premium: string;
    financing_charges?: string;
    payment_method: PolicyPaymentMethod;
    issue_date: string;
    vehicles: PolicyVehicle[];
    installments?: PolicyInstallment[];
    clauses?: PolicyClause[];
}
