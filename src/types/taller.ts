export interface WorkshopInsurerSummary {
    id: number;
    insurer_code: string;
    name: string;
    is_active: boolean;
}

export interface WorkshopRead {
    id: number;
    name: string;
    ruc: string;
    address: string;
    phone: string;
    contact_executive: string;
    executive_phone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    insurer_ids: number[];
    insurers_summary: WorkshopInsurerSummary[];
}

export interface WorkshopWritePayload {
    name: string;
    ruc: string;
    address: string;
    phone: string;
    contact_executive: string;
    executive_phone: string;
    is_active?: boolean;
    insurer_ids?: number[];
}

export type WorkshopUpdateRequest = WorkshopWritePayload;
export type WorkshopSummary = WorkshopInsurerSummary;

export type TallerInsurerSummary = WorkshopInsurerSummary;
export type Taller = WorkshopRead;
export type FormTaller = WorkshopWritePayload;
