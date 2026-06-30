import type { FormCliente } from '../types/cliente';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value?: string): boolean {
    if (!value || !ISO_DATE_RE.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function isAtLeast18(value: string): boolean {
    const birthDate = new Date(`${value}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }
    return age >= 18;
}

function isValidEcuadorianCedula(value?: string): boolean {
    if (!/^\d{10}$/.test(value || '')) return false;
    const digits = value!.split('').map(Number);
    const province = Number(value!.slice(0, 2));
    if (province < 1 || province > 24 || digits[2] > 5) return false;

    const total = digits.slice(0, 9).reduce((sum, digit, index) => {
        let computed = digit * (index % 2 === 0 ? 2 : 1);
        if (computed > 9) computed -= 9;
        return sum + computed;
    }, 0);
    const checkDigit = total % 10 === 0 ? 0 : 10 - (total % 10);
    return checkDigit === digits[9];
}

function isValidEcuadorianRuc(value?: string): boolean {
    if (!/^\d{13}$/.test(value || '') || !value!.endsWith('001')) return false;

    const thirdDigit = Number(value![2]);
    if (thirdDigit < 6) {
        return isValidEcuadorianCedula(value!.slice(0, 10));
    }

    const digits = value!.split('').map(Number);
    if (thirdDigit === 6) {
        const coefficients = [3, 2, 7, 6, 5, 4, 3, 2];
        const total = coefficients.reduce((sum, coefficient, index) => sum + coefficient * digits[index], 0);
        const checkDigit = 11 - (total % 11);
        return (checkDigit === 11 ? 0 : checkDigit) === digits[8];
    }

    if (thirdDigit === 9) {
        const coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2];
        const total = coefficients.reduce((sum, coefficient, index) => sum + coefficient * digits[index], 0);
        const checkDigit = 11 - (total % 11);
        return (checkDigit === 11 ? 0 : checkDigit) === digits[9];
    }

    return false;
}


function validateCommonFields(form: FormCliente, errors: Record<string, string>) {
    if (!form.first_names?.trim()) errors.first_names = 'Ingresa los nombres del cliente.';
    if (!form.phone_1?.trim()) errors.phone_1 = 'Ingresa el telefono principal.';
    if (!form.email?.trim()) errors.email = 'Ingresa el correo del cliente.';
    if (!form.residence_country?.trim()) errors.residence_country = 'Selecciona el pais de residencia.';
    if (!form.residence_province?.trim()) errors.residence_province = 'Selecciona la provincia de residencia.';
    if (!form.residence_city?.trim()) errors.residence_city = 'Selecciona la ciudad de residencia.';
    if (!form.address?.trim()) errors.address = 'Ingresa la direccion del cliente.';
}

function validateNaturalPersonFields(form: FormCliente, errors: Record<string, string>) {
    if (!form.last_names?.trim()) errors.last_names = 'Ingresa los apellidos del cliente.';
    if (!form.birth_date) errors.birth_date = 'Ingresa la fecha de nacimiento.';
    if (!form.sex) errors.sex = 'Selecciona el sexo del cliente.';
    if (!form.marital_status) errors.marital_status = 'Selecciona el estado civil del cliente.';
    if (!form.occupation) errors.occupation = 'Selecciona la ocupacion del cliente.';
    if (!form.birth_country?.trim()) errors.birth_country = 'Selecciona el pais de nacimiento.';
    if (!form.birth_province?.trim()) errors.birth_province = 'Selecciona la provincia de nacimiento.';
    if (!form.birth_city?.trim()) errors.birth_city = 'Selecciona la ciudad de nacimiento.';
}

function validateBasicFields(form: FormCliente, isLegalEntity: boolean, errors: Record<string, string>) {
    validateCommonFields(form, errors);
    if (!isLegalEntity) {
        validateNaturalPersonFields(form, errors);
    }
}

function validateDates(form: FormCliente, isLegalEntity: boolean, errors: Record<string, string>) {
    if (form.birth_date) {
        if (!isIsoDate(form.birth_date)) {
            errors.birth_date = 'La fecha debe estar en formato YYYY-MM-DD.';
        } else if (form.birth_date > todayIso()) {
            errors.birth_date = 'La fecha de nacimiento no puede ser futura.';
        } else if (!isLegalEntity && !isAtLeast18(form.birth_date)) {
            errors.birth_date = 'El cliente debe tener al menos 18 años.';
        }
    }
}

function validateIdentification(form: FormCliente, isLegalEntity: boolean, errors: Record<string, string>) {
    if (isLegalEntity && form.document_type !== 'RUC') errors.document_type = 'Para persona juridica el tipo de documento debe ser RUC.';
    if (!isLegalEntity && form.document_type === 'RUC') errors.document_type = 'Para persona natural no se permite RUC.';
    if (!form.document_number) errors.document_number = 'Ingresa el numero de documento.';
    else if (form.document_type === 'CC' && !isValidEcuadorianCedula(form.document_number)) errors.document_number = 'La cedula ecuatoriana no es valida.';
    else if (form.document_type === 'RUC' && !isValidEcuadorianRuc(form.document_number)) errors.document_number = 'El RUC ecuatoriano no es valido.';
    else if (form.document_type === 'PAS' && !/^[a-zA-Z0-9]{6,20}$/.test(form.document_number.trim())) errors.document_number = 'El pasaporte debe tener entre 6 y 20 letras o numeros.';
    if (isLegalEntity) {
        if (!form.manager_document_number) errors.manager_document_number = 'Ingresa la cedula del gerente.';
        else if (!isValidEcuadorianCedula(form.manager_document_number)) errors.manager_document_number = 'La cedula ecuatoriana no es valida.';
    }
}

function validatePhones(form: FormCliente, errors: Record<string, string>) {
    if (!/^\d{10}$/.test(form.phone_1 || '')) errors.phone_1 = 'El telefono principal debe tener exactamente 10 digitos.';
    if (form.phone_2 && !/^\d{10}$/.test(form.phone_2)) errors.phone_2 = 'El telefono secundario debe tener exactamente 10 digitos.';
}

function validateConjugalFields(form: FormCliente, files: Record<string, File | null>, isCreate: boolean, errors: Record<string, string>) {
    if (!form.spouse_document_number?.trim()) errors.spouse_document_number = 'Ingresa la cedula del conyuge.';
    else if (!isValidEcuadorianCedula(form.spouse_document_number)) errors.spouse_document_number = 'La cedula del conyuge no es valida.';
    if (isCreate && !(files.doc_cedula_conyuge instanceof File)) errors.doc_cedula_conyuge = 'Adjunta la cedula del conyuge.';
}

function validateNonConjugalFields(form: FormCliente, files: Record<string, File | null>, errors: Record<string, string>) {
    if (form.spouse_document_number?.trim()) errors.spouse_document_number = 'Retira la cedula del conyuge para este estado civil.';
    if (files.doc_cedula_conyuge instanceof File) errors.doc_cedula_conyuge = 'Retira el archivo del conyuge para este estado civil.';
}

function validateNaturalPersonFiles(files: Record<string, File | null>, errors: Record<string, string>) {
    if (!(files.doc_cedula_asegurado instanceof File)) errors.doc_cedula_asegurado = 'Adjunta la cedula del asegurado.';
    if (!(files.doc_planilla_servicio_basico instanceof File)) errors.doc_planilla_servicio_basico = 'Adjunta la planilla de servicio basico.';
}

function validateLegalEntityFiles(files: Record<string, File | null>, errors: Record<string, string>) {
    if (!(files.doc_cedula_gerente instanceof File)) errors.doc_cedula_gerente = 'Adjunta la cedula del gerente.';
    if (!(files.doc_escritura_constitucion instanceof File)) errors.doc_escritura_constitucion = 'Adjunta la escritura de constitucion.';
    if (!(files.doc_planilla_servicio_basico instanceof File)) errors.doc_planilla_servicio_basico = 'Adjunta la planilla de servicio basico.';
    if (!(files.doc_nomina_accionistas instanceof File)) errors.doc_nomina_accionistas = 'Adjunta la nomina de accionistas.';
    if (!(files.doc_certificado_cumplimiento instanceof File)) errors.doc_certificado_cumplimiento = 'Adjunta el certificado de cumplimiento.';
    if (!(files.doc_declaracion_renta instanceof File)) errors.doc_declaracion_renta = 'Adjunta la declaracion de renta.';
}

function validateRequiredFiles(files: Record<string, File | null>, isCreate: boolean, isLegalEntity: boolean, errors: Record<string, string>) {
    if (!isCreate) return;
    if (isLegalEntity) {
        validateLegalEntityFiles(files, errors);
    } else {
        validateNaturalPersonFiles(files, errors);
    }
}

function validateFileFormats(files: Record<string, File | null>, errors: Record<string, string>) {
    const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    const maxFileSize = 5 * 1024 * 1024;
    for (const [key, file] of Object.entries(files)) {
        if (!(file instanceof File)) continue;
        const extension = file.name.toLowerCase().split('.').pop();
        const hasAllowedExtension = extension ? ['pdf', 'jpg', 'jpeg', 'png'].includes(extension) : false;
        if (!allowedMimeTypes.has(file.type) || !hasAllowedExtension) {
            errors[key] = 'Adjunta un archivo PDF, JPG o PNG.';
            continue;
        }
        if (file.size > maxFileSize) {
            errors[key] = 'El archivo no debe superar los 5 MB.';
        }
    }
}

export function validateCustomerForm(form: FormCliente, files: Record<string, File | null>, isCreate: boolean): Record<string, string> {
    const errors: Record<string, string> = {};
    const isLegalEntity = form.person_type === 'legal_entity';
    const isConjugalStatus = form.marital_status === 'married' || form.marital_status === 'common_law';

    validateBasicFields(form, isLegalEntity, errors);
    validateDates(form, isLegalEntity, errors);
    validateIdentification(form, isLegalEntity, errors);
    validatePhones(form, errors);
    if (isConjugalStatus) {
        validateConjugalFields(form, files, isCreate, errors);
    } else {
        validateNonConjugalFields(form, files, errors);
    }
    validateRequiredFiles(files, isCreate, isLegalEntity, errors);
    validateFileFormats(files, errors);

    return errors;
}
