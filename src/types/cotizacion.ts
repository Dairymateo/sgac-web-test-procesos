export type QuoteStatus = 'draft' | 'scoring_generated' | 'manually_adjusted' | 'approved' | 'rejected';
export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MlRateBreakdown {
    segment: string;
    segment_base_rate: number;
    commercial_rate?: number;
    individual_factor: number;
    factors: Array<{ name: string; factor: number; detail: Record<string, unknown> }>;
    pre_cap_rate: number;
    cap_applied: boolean;
    final_rate: number;
}

export interface MlExplainabilityFactor {
    feature: string;
    value_used: string | number | null;
    contribution: 'positive' | 'negative';
}

export interface MlExplainability {
    method: string;
    feature_contributions: MlExplainabilityFactor[];
    top_factors: MlExplainabilityFactor[];
}

export interface MlResponsePayload {
    suggested_rate?: number;
    suggested_premium?: number;
    risk_score?: number;
    risk_band?: string;
    rate_breakdown?: MlRateBreakdown;
    explainability?: MlExplainability;
    model_version?: string;
    inference_id?: string;
    inference_at?: string;
}

export interface QuoteVehicle {
    vehicle: number;
    vehicle_value?: string;
    vehicle_value_override_reason?: string;

    id?: number;
    vehicle_number?: number;
    license_plate?: string;
    brand?: string;
    model?: string;
    suggested_rate?: string | null;
    suggested_premium?: string | null;
    final_premium?: string | null;
    risk_score?: string | null;
    risk_band?: string | null;
    ml_response_payload?: MlResponsePayload | null;
}

export interface Cotizacion {
    id: number;
    insured_client: number;
    insurer: number;
    insurer_name?: string;
    vehicles?: QuoteVehicle[];
    total_vehicle_value?: string | null;
    customer_accidents_5y?: number;
    vehicle_accidents_5y?: number;
    status: QuoteStatus;
    risk_score?: string | null;
    risk_band?: RiskBand | null;
    suggested_rate?: string | null;
    suggested_premium?: string | null;
    final_premium?: string | null;
    currency?: string;
    ml_request_id?: string | null;
    inference_id?: string | null;
    inference_at?: string | null;
    model_version?: string | null;
    ml_response_payload?: MlResponsePayload | null;
    manual_override_reason?: string | null;
    rejection_reason?: string | null;
    approved_by?: number | null;
    rejected_by?: number | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    created_at?: string;
    updated_at?: string;
    customer_code?: string | null;
    approved_by_email?: string | null;
    rejected_by_email?: string | null;
    policy_id?: number | null;
    policy_status?: string | null;
}

export interface CreateQuoteRequest {
    insured_client: number;
    insurer: number;
    vehicles: QuoteVehicle[];
}

export interface AdjustQuoteRequest {
    final_premium: string;
    manual_override_reason: string;
}

export interface ApproveQuoteRequest {
    final_premium?: string;
    document_type?: 'new' | 'renewal' | 'endorsement_addition' | 'endorsement_inclusion';
    renewal_number?: number;
    affected_document?: string;
    valid_from?: string;
    valid_until?: string;
    issue_date?: string;
    branch?: string;
    payment_method?: 'cash' | 'installments';
}

export interface RejectQuoteRequest {
    rejection_reason: string;
}
