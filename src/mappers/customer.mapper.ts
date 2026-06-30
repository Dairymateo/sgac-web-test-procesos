import type { Cliente, FormCliente, CustomerFiles } from '../types/cliente';

export const FILE_FIELD_MAP: Record<string, keyof CustomerFiles> = {
    doc_cedula_asegurado: 'insured_id_document',
    doc_cedula_gerente: 'manager_id_document',
    doc_cedula_conyuge: 'spouse_id_document',
    doc_planilla_servicio_basico: 'basic_service_bill_document',
    doc_escritura_constitucion: 'incorporation_deed_document',
    doc_nomina_accionistas: 'shareholder_payroll_document',
    doc_certificado_cumplimiento: 'compliance_certificate_document',
    doc_declaracion_renta: 'income_tax_return_document',
};

const up = (s: string | undefined | null) => s ? s.trim().toUpperCase() : s;

export function toBackendCustomerPayload(data: Partial<FormCliente>) {
    const documentNumber = up(data.document_number);
    const isLegalEntity = data.person_type === 'legal_entity';

    return {
        person_type: data.person_type,
        first_names: up(data.first_names),
        last_names: up(data.last_names),
        document_type: data.document_type,
        document_number: documentNumber,
        birth_date: isLegalEntity ? undefined : data.birth_date,
        sex: isLegalEntity ? undefined : data.sex,
        marital_status: isLegalEntity ? undefined : data.marital_status,
        occupation: isLegalEntity ? undefined : data.occupation,
        birth_country: isLegalEntity ? undefined : up(data.birth_country),
        birth_province: isLegalEntity ? undefined : up(data.birth_province),
        birth_city: isLegalEntity ? undefined : up(data.birth_city),
        residence_country: up(data.residence_country),
        residence_province: up(data.residence_province),
        residence_city: up(data.residence_city),
        address: up(data.address),
        phone_1: data.phone_1,
        phone_2: data.phone_2,
        email: data.email,
        email_2: data.email_2,
        manager_document_number: isLegalEntity ? up(data.manager_document_number) : undefined,
        spouse_document_number: isLegalEntity ? undefined : up(data.spouse_document_number),
    };
}

export function fromBackendCustomer(item: any): Cliente {
    return {
        id: item.id,
        registration_date: item.registration_date,
        customer_code: item.customer_code,
        person_type: item.person_type,
        first_names: item.first_names,
        last_names: item.last_names,
        document_type: item.document_type,
        document_number: item.document_number,
        birth_date: item.birth_date,
        sex: item.sex,
        marital_status: item.marital_status,
        occupation: item.occupation,
        birth_country: item.birth_country || '',
        birth_province: item.birth_province || '',
        birth_city: item.birth_city || '',
        residence_country: item.residence_country || '',
        residence_province: item.residence_province || '',
        residence_city: item.residence_city || '',
        address: item.address || '',
        phone_1: item.phone_1 || '',
        phone_2: item.phone_2 || '',
        email: item.email || '',
        email_2: item.email_2 || '',
        manager_document_number: item.manager_document_number,
        spouse_document_number: item.spouse_document_number,
        is_active: item.is_active,
        archivos: {
            insured_id_document: item.insured_id_document,
            manager_id_document: item.manager_id_document,
            spouse_id_document: item.spouse_id_document,
            basic_service_bill_document: item.basic_service_bill_document,
            incorporation_deed_document: item.incorporation_deed_document,
            shareholder_payroll_document: item.shareholder_payroll_document,
            compliance_certificate_document: item.compliance_certificate_document,
            income_tax_return_document: item.income_tax_return_document,
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
    };
}
