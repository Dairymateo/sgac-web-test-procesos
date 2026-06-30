export interface InsurerWorkshopSummary {
    id: number;
    name: string;
    ruc: string;
    is_active: boolean;
}

export interface Aseguradora {
    id: number;
    registration_date: string;
    insurer_code: string;
    name: string;
    document_type: string;
    document_number: string;
    country: string;
    province: string;
    city: string;
    address: string;
    phone: string;
    account_executive_name: string;
    account_executive_phone: string;
    account_executive_email: string;
    claims_executive_name: string;
    claims_executive_phone: string;
    claims_executive_email: string;
    portfolio_executive_name: string;
    portfolio_executive_phone: string;
    portfolio_executive_email: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    workshop_ids: number[];
    workshops_summary: InsurerWorkshopSummary[];
}

export interface FormAseguradora {
    id?: number;
    registration_date: string;
    name: string;
    document_type: string;
    document_number: string;
    country: string;
    province: string;
    city: string;
    address: string;
    phone: string;
    account_executive_name: string;
    account_executive_phone: string;
    account_executive_email: string;
    claims_executive_name: string;
    claims_executive_phone: string;
    claims_executive_email: string;
    portfolio_executive_name: string;
    portfolio_executive_phone: string;
    portfolio_executive_email: string;
    is_active: boolean;
    workshop_ids: number[];
}
