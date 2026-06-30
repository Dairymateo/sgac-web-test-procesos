export type ClaimDamageType = 'partial' | 'total' | 'third_party' | 'other';
export type ClaimStatus = 'reported' | 'in_progress' | 'authorized' | 'under_repair' | 'closed';
export type ClaimDocumentType = 'id_card' | 'license' | 'registration' | 'form' | 'estimate' | 'other';
export type ClaimCoverageType = 'own_damage' | 'civil_liability';
export type ClaimPaymentType = 'workshop_assignment' | 'reimbursement';

export interface ClaimInsurerDetail {
    id?: number;
    insurer_code?: string;
    name?: string;
    claims_executive_name?: string;
    claims_executive_phone?: string;
    claims_executive_email?: string;
}

export interface ClaimDocument {
    id: number;
    claim: number;
    document_type: ClaimDocumentType;
    delivered: boolean;
    file: string | null;
    observation: string;
    delivery_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface ClaimDocumentWrite {
    id?: number;
    document_type?: ClaimDocumentType;
    delivered?: boolean;
    observation?: string;
    delivery_date?: string | null;
    delete?: boolean;
    file?: File | null;
}

export interface Claim {
    id: number;
    insured_customer: number;
    vehicle: number;
    policy_vehicle?: number | null;
    insurer: number;
    workshop: number | null;
    claim_number: string;
    claim_date: string;
    broker_report_date: string | null;
    insurer_report_date: string | null;
    documentation_date?: string | null;
    repair_authorization_date: string | null;
    estimated_departure_date: string | null;
    payment_date: string | null;
    damage_type: ClaimDamageType;
    coverage_type?: ClaimCoverageType | null;
    payment_type?: ClaimPaymentType | null;
    claim_description: string;
    vehicle_driver: string;
    insurer_executive: string;
    insurer_executive_phone: string;
    claim_amount: string | null;
    adjusted_amount: string | null;
    delivery_status_confirmation: string;
    status: ClaimStatus;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    workshop_detalle?: Record<string, unknown>;
    insurer_detalle?: ClaimInsurerDetail;
    documents: ClaimDocument[];
}

export interface ClaimWritePayload {
    insured_customer: number;
    vehicle: number;
    policy_vehicle?: number | null;
    insurer: number | null;
    workshop?: number | null;
    claim_date: string;
    broker_report_date?: string | null;
    insurer_report_date?: string | null;
    documentation_date?: string | null;
    repair_authorization_date?: string | null;
    estimated_departure_date?: string | null;
    payment_date?: string | null;
    damage_type?: ClaimDamageType;
    coverage_type?: ClaimCoverageType | null;
    payment_type?: ClaimPaymentType | null;
    claim_description: string;
    vehicle_driver?: string;
    insurer_executive?: string;
    insurer_executive_phone?: string;
    claim_amount?: string | null;
    adjusted_amount?: string | null;
    delivery_status_confirmation?: string;
    status?: ClaimStatus;
    is_active?: boolean;
    documents?: ClaimDocumentWrite[];
}
