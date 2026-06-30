/// <summary>
/// Componente ClienteFormModal.test.tsx
/// </summary>
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClienteFormModal from '../../../pages/Clientes/components/ClienteFormModal';
import { AuthProvider } from '../../../context/AuthContext';
import * as clientesService from '../../../services/clientes.service';

vi.mock('../../../services/clientes.service');
vi.mock('../../../services/geo.service', () => ({
  fetchCountries: vi.fn().mockResolvedValue([{ name: 'Ecuador', iso2: 'EC' }]),
  fetchStates: vi.fn().mockResolvedValue([{ name: 'Pichincha', state_code: 'P' }]),
  fetchCities: vi.fn().mockResolvedValue([{ name: 'Quito' }]),
}));

describe('ClienteFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (clientesService.createCliente as any).mockResolvedValue({ id: 1 });
    (clientesService.updateCliente as any).mockResolvedValue({ id: 1 });
    (clientesService.getCustomerDocumentUrl as any).mockResolvedValue('https://signed.example.com/doc.pdf');
  });

  const renderComponent = (props: any = {}) =>
    render(
      <AuthProvider>
        <ClienteFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveSuccess={vi.fn()}
          canMutate={true}
          {...props}
        />
      </AuthProvider>
    );

  const fillIndividualLocation = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Ubicacion/i }));
    await waitFor(() => expect(screen.getByLabelText(/Pais Nacimiento/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Pais Nacimiento/i), { target: { value: 'Ecuador' } });
    
    await waitFor(() => expect(screen.getByLabelText(/Provincia Nacimiento/i)).not.toBeDisabled());
    await waitFor(() => expect(screen.getByLabelText(/Provincia Nacimiento/i).querySelector('option[value="Pichincha"]')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Provincia Nacimiento/i), { target: { value: 'Pichincha' } });
    
    await waitFor(() => expect(screen.getByLabelText(/Ciudad Nacimiento/i)).not.toBeDisabled());
    await waitFor(() => expect(screen.getByLabelText(/Ciudad Nacimiento/i).querySelector('option[value="Quito"]')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Ciudad Nacimiento/i), { target: { value: 'Quito' } });
    
    fireEvent.change(screen.getByLabelText(/Pais Residencia/i), { target: { value: 'Ecuador' } });
    
    await waitFor(() => expect(screen.getByLabelText(/Provincia Residencia/i)).not.toBeDisabled());
    await waitFor(() => expect(screen.getByLabelText(/Provincia Residencia/i).querySelector('option[value="Pichincha"]')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Provincia Residencia/i), { target: { value: 'Pichincha' } });
    
    await waitFor(() => expect(screen.getByLabelText(/Ciudad Residencia/i)).not.toBeDisabled());
    await waitFor(() => expect(screen.getByLabelText(/Ciudad Residencia/i).querySelector('option[value="Quito"]')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Ciudad Residencia/i), { target: { value: 'Quito' } });
    
    fireEvent.change(screen.getByLabelText(/^Direccion/i), { target: { value: 'Av. Siempre Viva 123' } });
    fireEvent.click(screen.getByRole('button', { name: /Datos Generales/i }));
  };

  it('renderiza formulario base', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument());
    expect(screen.getByLabelText(/Tipo de Persona/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Numero de Documento/i)).toBeInTheDocument();
  });

  it('cambia a juridica y muestra campos legales', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/Tipo de Persona/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Tipo de Persona/i), { target: { value: 'legal_entity' } });

    expect(screen.getByLabelText(/Numero de RUC/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Identificación Gerente/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^RUC$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fecha de Nacimiento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sexo/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Estado Civil/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ocupacion/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ubicacion/i }));
    await waitFor(() => expect(screen.getByLabelText(/País de domicilio/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/Provincia de domicilio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ciudad de domicilio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección matriz\/domicilio fiscal/i)).toBeInTheDocument();
  });

  it('no muestra RUC como tipo de documento para persona natural', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/Tipo de Documento/i)).toBeInTheDocument());

    const documentType = screen.getByLabelText(/Tipo de Documento/i) as HTMLSelectElement;
    const options = Array.from(documentType.options).map((o) => o.value);
    expect(options).toEqual(['CC', 'PAS']);
  });

  it('muestra solo RUC como tipo de documento para persona juridica', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/Tipo de Persona/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Tipo de Persona/i), { target: { value: 'legal_entity' } });

    const documentType = screen.getByLabelText(/Tipo de Documento/i) as HTMLSelectElement;
    const options = Array.from(documentType.options).map((o) => o.value);
    expect(options).toEqual(['RUC']);
    expect(documentType.value).toBe('RUC');
  });

  it('envia create cuando es nuevo cliente', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByLabelText(/Nombres/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Numero de Documento/i), { target: { value: '1710034065' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento/i), { target: { value: '1990-01-01' } });
    await fillIndividualLocation();
    fireEvent.change(screen.getByLabelText(/Telefono Principal/i), { target: { value: '0999999999' } });
    fireEvent.change(screen.getByLabelText(/^Correo \*/i), { target: { value: 'juan@test.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByLabelText(/Cedula Asegurado/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Cedula Asegurado/i), {
      target: { files: [new File(['x'], 'id.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText(/Planilla Servicio Basico/i), {
      target: { files: [new File(['x'], 'bill.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }));

    await waitFor(() => expect(clientesService.createCliente).toHaveBeenCalled(), { timeout: 3000 });
  }, 15000);

  it('pinta errores de validacion del backend debajo de cada campo', async () => {
    (clientesService.createCliente as any).mockRejectedValueOnce({
      message: 'Invalid data.',
      requestId: 'f855e9bd-c913-483f-815b-f1abc29b94a4',
      fieldErrors: {
        document_number: 'document_number must be a valid Ecuadorian cedula.',
        birth_date: 'Customer must be at least 18 years old.',
      },
    });

    renderComponent();

    await waitFor(() => expect(screen.getByLabelText(/Nombres/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Numero de Documento/i), { target: { value: '1710034065' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento/i), { target: { value: '1990-01-01' } });
    await fillIndividualLocation();
    fireEvent.change(screen.getByLabelText(/Telefono Principal/i), { target: { value: '0999999999' } });
    fireEvent.change(screen.getByLabelText(/^Correo \*/i), { target: { value: 'juan@test.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByLabelText(/Cedula Asegurado/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Cedula Asegurado/i), {
      target: { files: [new File(['x'], 'id.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText(/Planilla Servicio Basico/i), {
      target: { files: [new File(['x'], 'bill.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }));

    await waitFor(() => {
      expect(screen.getByText('Revisa los campos marcados antes de guardar.')).toBeInTheDocument();
      expect(screen.getByText('La cedula ecuatoriana no es valida.')).toBeInTheDocument();
      expect(screen.getByText('El cliente debe tener al menos 18 años.')).toBeInTheDocument();
      expect(screen.getByText(/ID soporte: f855e9bd-c913-483f-815b-f1abc29b94a4/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/"validation_error"/)).not.toBeInTheDocument();
    expect(screen.queryByText(/valid Ecuadorian cedula/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Customer must be/i)).not.toBeInTheDocument();
  }, 15000);

  it('permite pasaporte alfanumerico y lo normaliza a mayusculas', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByLabelText(/Tipo de Documento/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Tipo de Documento/i), { target: { value: 'PAS' } });
    fireEvent.change(screen.getByLabelText(/Numero de Documento/i), { target: { value: 'ab123456' } });

    expect(screen.getByLabelText(/Numero de Documento/i)).toHaveValue('AB123456');
  });

  it('traduce error backend de pasaporte invalido', async () => {
    (clientesService.createCliente as any).mockRejectedValueOnce({
      message: 'Invalid data.',
      fieldErrors: {
        document_number: 'document_number must be alphanumeric and contain between 6 and 20 characters for document_type PAS.',
      },
    });

    renderComponent();

    await waitFor(() => expect(screen.getByLabelText(/Nombres/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Tipo de Documento/i), { target: { value: 'PAS' } });
    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Numero de Documento/i), { target: { value: 'AB123456' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento/i), { target: { value: '1990-01-01' } });
    await fillIndividualLocation();
    fireEvent.change(screen.getByLabelText(/Telefono Principal/i), { target: { value: '0999999999' } });
    fireEvent.change(screen.getByLabelText(/^Correo \*/i), { target: { value: 'juan@test.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByLabelText(/Cedula Asegurado/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Cedula Asegurado/i), {
      target: { files: [new File(['x'], 'id.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText(/Planilla Servicio Basico/i), {
      target: { files: [new File(['x'], 'bill.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }));

    await waitFor(() => {
      expect(screen.getByText('El pasaporte debe tener entre 6 y 20 letras o numeros.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/alphanumeric/i)).not.toBeInTheDocument();
  }, 15000);

  it('envia update cuando edita cliente', async () => {
    renderComponent({
      editingCliente: {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'Juan',
        last_names: 'Perez',
        document_type: 'CC',
        document_number: '1710034065',
        birth_date: '1990-01-01',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: 'Ecuador',
        birth_province: 'Pichincha',
        birth_city: 'Quito',
        residence_country: 'Ecuador',
        residence_province: 'Pichincha',
        residence_city: 'Quito',
        address: 'Av. Siempre Viva 123',
        phone_1: '0999999999',
        email: 'juan@test.com',
      },
    });

    const saveButton = await screen.findByRole('button', { name: /Guardar cambios/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Juan Carlos' } });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(clientesService.updateCliente).toHaveBeenCalled());
  });

  it('muestra acceso a documento actual cuando existe archivo en edicion', async () => {
    renderComponent({
      editingCliente: {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'Juan',
        last_names: 'Perez',
        document_type: 'CC',
        document_number: '1710034065',
        birth_date: '1990-01-01',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: 'Ecuador',
        birth_province: 'Pichincha',
        birth_city: 'Quito',
        residence_country: 'Ecuador',
        residence_province: 'Pichincha',
        residence_city: 'Quito',
        address: 'Av. Siempre Viva 123',
        phone_1: '0999999999',
        email: 'juan@test.com',
        archivos: {
          insured_id_document: 'https://example.com/id.pdf',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByText(/Documento actual: Ver/i)).toBeInTheDocument());
  });

  it('solicita URL temporal y abre documento actual', async () => {
    const openSpy = vi.spyOn(globalThis as any, 'open').mockImplementation(() => null);

    renderComponent({
      editingCliente: {
        id: 99,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'Juan',
        last_names: 'Perez',
        document_type: 'CC',
        document_number: '1710034065',
        birth_date: '1990-01-01',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: 'Ecuador',
        birth_province: 'Pichincha',
        birth_city: 'Quito',
        residence_country: 'Ecuador',
        residence_province: 'Pichincha',
        residence_city: 'Quito',
        address: 'Av. Siempre Viva 123',
        phone_1: '0999999999',
        email: 'juan@test.com',
        archivos: {
          insured_id_document: 'https://example.com/id.pdf',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByText(/Documento actual: Ver/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Documento actual: Ver/i));

    await waitFor(() => {
      expect(clientesService.getCustomerDocumentUrl).toHaveBeenCalledWith(99, 'insured_id_document');
      expect(openSpy).toHaveBeenCalledWith('https://signed.example.com/doc.pdf', '_blank', 'noopener,noreferrer');
    });

    openSpy.mockRestore();
  });

  it('oculta datos de conyuge para estado civil no conyugal', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/Estado Civil/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Estado Civil/i), { target: { value: 'single' } });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    expect(screen.queryByLabelText(/Cedula Conyuge/i)).not.toBeInTheDocument();
  });

  it('exige datos de conyuge para married/common_law', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/Estado Civil/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Estado Civil/i), { target: { value: 'married' } });

    expect(screen.getByLabelText(/Documento Conyuge/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Numero de Documento/i), { target: { value: '1710034065' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento/i), { target: { value: '1990-01-01' } });
    await fillIndividualLocation();
    fireEvent.change(screen.getByLabelText(/Telefono Principal/i), { target: { value: '0999999999' } });
    fireEvent.change(screen.getByLabelText(/^Correo \*/i), { target: { value: 'juan@test.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => expect(screen.getByLabelText(/Cedula Conyuge/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Cedula Asegurado/i), {
      target: { files: [new File(['x'], 'id.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText(/Planilla Servicio Basico/i), {
      target: { files: [new File(['x'], 'bill.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/i }));

    await waitFor(() => {

      expect(screen.getByText(/Ingresa la cedula del conyuge/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
    await waitFor(() => {
      expect(screen.getByText(/Adjunta la cedula del conyuge/i)).toBeInTheDocument();
    });
    expect(clientesService.createCliente).not.toHaveBeenCalled();
  }, 15000);
});