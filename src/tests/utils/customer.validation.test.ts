import { describe, expect, it } from 'vitest';
import { validateCustomerForm } from '../../utils/customer.validation';
import type { FormCliente } from '../../types/cliente';

const baseForm: FormCliente = {
  person_type: 'individual',
  first_names: 'Juan',
  last_names: 'Perez',
  document_type: 'CC',
  document_number: '1710034065',
  birth_date: '1990-01-01',
  sex: 'male',
  marital_status: 'single',
  occupation: 'private',
  birth_country: '',
  birth_province: '',
  birth_city: '',
  residence_country: 'Ecuador',
  residence_province: 'Pichincha',
  residence_city: 'Quito',
  address: 'Av. Siempre Viva 123',
  phone_1: '0999999999',
  phone_2: '',
  email: 'juan@test.com',
  email_2: '',
  manager_document_number: '',
  spouse_document_number: '',
  registration_date: '2026-05-27',
};

const requiredIndividualFiles = {
  doc_cedula_asegurado: new File(['x'], 'id.pdf', { type: 'application/pdf' }),
  doc_planilla_servicio_basico: new File(['x'], 'bill.pdf', { type: 'application/pdf' }),
};

const validIndividualForm: FormCliente = {
  ...baseForm,
  birth_country: 'Ecuador',
  birth_province: 'Pichincha',
  birth_city: 'Quito',
};

describe('validateCustomerForm - spouse rules', () => {
  it('falla si married/common_law no incluye datos de conyuge', () => {
    const form = { ...validIndividualForm, marital_status: 'married', spouse_document_number: '' } as FormCliente;
    const errors = validateCustomerForm(form, requiredIndividualFiles, true);

    expect(errors.spouse_document_number).toBeTruthy();
    expect(errors.doc_cedula_conyuge).toBeTruthy();
  });

  it('falla si single/divorced/widowed incluye datos de conyuge', () => {
    const form = { ...validIndividualForm, marital_status: 'single', spouse_document_number: '0926687856' } as FormCliente;
    const errors = validateCustomerForm(
      form,
      {
        ...requiredIndividualFiles,
        doc_cedula_conyuge: new File(['x'], 'spouse.pdf', { type: 'application/pdf' }),
      },
      true
    );

    expect(errors.spouse_document_number).toBeTruthy();
    expect(errors.doc_cedula_conyuge).toBeTruthy();
  });
});

describe('validateCustomerForm - backend customer contract', () => {
  it('valida cedula ecuatoriana y edad minima', () => {
    const errors = validateCustomerForm(
      {
        ...validIndividualForm,
        document_number: '2324545676',
        birth_date: '2026-05-31',
      },
      requiredIndividualFiles,
      true
    );

    expect(errors.document_number).toBe('La cedula ecuatoriana no es valida.');
    expect(errors.birth_date).toBe('El cliente debe tener al menos 18 años.');
    expect(errors.registration_date).toBeUndefined();
  });

  it('valida reglas de persona juridica y RUC', () => {
    const errors = validateCustomerForm(
      {
        ...validIndividualForm,
        person_type: 'legal_entity',
        document_type: 'RUC',
        document_number: '1710034065001',
        manager_document_number: '0926687856',
        birth_date: '',
      },
      {
        doc_cedula_gerente: new File(['x'], 'manager.pdf', { type: 'application/pdf' }),
        doc_planilla_servicio_basico: new File(['x'], 'bill.pdf', { type: 'application/pdf' }),
        doc_escritura_constitucion: new File(['x'], 'deed.pdf', { type: 'application/pdf' }),
        doc_nomina_accionistas: new File(['x'], 'shareholders.pdf', { type: 'application/pdf' }),
        doc_certificado_cumplimiento: new File(['x'], 'compliance.pdf', { type: 'application/pdf' }),
        doc_declaracion_renta: new File(['x'], 'tax.pdf', { type: 'application/pdf' }),
      },
      true
    );

    expect(errors).toEqual({});
  });

  it('exige nacimiento, residencia y direccion para persona natural', () => {
    const errors = validateCustomerForm(
      {
        ...baseForm,
        birth_country: '',
        birth_province: '',
        birth_city: '',
        residence_country: '',
        residence_province: '',
        residence_city: '',
        address: '',
      },
      requiredIndividualFiles,
      true
    );

    expect(errors.birth_country).toBeTruthy();
    expect(errors.birth_province).toBeTruthy();
    expect(errors.birth_city).toBeTruthy();
    expect(errors.residence_country).toBeTruthy();
    expect(errors.residence_province).toBeTruthy();
    expect(errors.residence_city).toBeTruthy();
    expect(errors.address).toBeTruthy();
  });

  it('permite pasaporte alfanumerico entre 6 y 20 caracteres', () => {
    const errors = validateCustomerForm(
      {
        ...validIndividualForm,
        document_type: 'PAS',
        document_number: 'ab123456',
      },
      requiredIndividualFiles,
      true
    );

    expect(errors.document_number).toBeUndefined();
  });

  it('rechaza pasaporte con simbolos o longitud fuera de rango', () => {
    const shortPassport = validateCustomerForm(
      { ...validIndividualForm, document_type: 'PAS', document_number: 'AB-123' },
      requiredIndividualFiles,
      true
    );
    const longPassport = validateCustomerForm(
      { ...validIndividualForm, document_type: 'PAS', document_number: 'AB12345678901234567890' },
      requiredIndividualFiles,
      true
    );

    expect(shortPassport.document_number).toBe('El pasaporte debe tener entre 6 y 20 letras o numeros.');
    expect(longPassport.document_number).toBe('El pasaporte debe tener entre 6 y 20 letras o numeros.');
  });

  it('rechaza archivo con extension no permitida aunque tenga MIME valido', () => {
    const errors = validateCustomerForm(
      validIndividualForm,
      {
        ...requiredIndividualFiles,
        doc_planilla_servicio_basico: new File(['x'], 'bill.gif', { type: 'image/png' }),
      },
      true
    );

    expect(errors.doc_planilla_servicio_basico).toBe('Adjunta un archivo PDF, JPG o PNG.');
  });
});

