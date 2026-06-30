export type PersonTypeEnum = 'individual' | 'legal_entity';
export type DocumentTypeEnum = 'CC' | 'RUC' | 'PAS';
export type SexEnum = 'male' | 'female' | 'other';
export type MaritalStatusEnum = 'married' | 'single' | 'divorced' | 'widowed' | 'common_law';
export type OccupationEnum = 'private' | 'public';

export interface CustomerFiles {
    doc_cedula_asegurado?: File | string;
    doc_cedula_gerente?: File | string;
    doc_cedula_conyuge?: File | string;
    doc_planilla_servicio_basico?: File | string;
    doc_escritura_constitucion?: File | string;
    doc_nomina_accionistas?: File | string;
    doc_certificado_cumplimiento?: File | string;
    doc_declaracion_renta?: File | string;
    insured_id_document?: File | string;
    manager_id_document?: File | string;
    spouse_id_document?: File | string;
    basic_service_bill_document?: File | string;
    incorporation_deed_document?: File | string;
    shareholder_payroll_document?: File | string;
    compliance_certificate_document?: File | string;
    income_tax_return_document?: File | string;
}

export type ClienteFiles = CustomerFiles;

export interface Cliente {
    id: number;
    registration_date: string;
    customer_code?: string;
    person_type: PersonTypeEnum;
    first_names: string;
    last_names: string;
    document_type: DocumentTypeEnum;
    document_number: string;
    birth_date: string;
    sex: SexEnum;
    marital_status: MaritalStatusEnum;
    occupation: OccupationEnum;
    birth_country: string;
    birth_province: string;
    birth_city: string;
    residence_country: string;
    residence_province: string;
    residence_city: string;
    address: string;
    phone_1: string;
    phone_2?: string;
    email: string;
    email_2?: string;
    manager_document_number?: string;
    spouse_document_number?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    archivos?: CustomerFiles;
}

export type FormCliente =
    Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'archivos' | 'registration_date'> &
    Partial<Pick<Cliente, 'registration_date'>> & {
        id?: number;
        archivos_pendientes?: CustomerFiles;
    };

