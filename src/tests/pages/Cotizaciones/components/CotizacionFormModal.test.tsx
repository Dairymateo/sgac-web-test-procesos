/// <summary>
/// Componente CotizacionFormModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionFormModal from '../../../../pages/Cotizaciones/components/CotizacionFormModal';
import { createCotizacionML, createCotizacionDraft } from '../../../../services/cotizaciones.service';
import { getClientes } from '../../../../services/clientes.service';
import { getVehiculos } from '../../../../services/vehiculos.service';
import { getAseguradoras } from '../../../../services/aseguradoras.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
  createCotizacionML: vi.fn(),
  createCotizacionDraft: vi.fn(),
}));

vi.mock('../../../../services/clientes.service', () => ({
  getClientes: vi.fn(),
}));

vi.mock('../../../../services/vehiculos.service', () => ({
  getVehiculos: vi.fn(),
}));

vi.mock('../../../../services/aseguradoras.service', () => ({
  getAseguradoras: vi.fn(),
}));

const MOCK_ASEGURADORAS = [
  { id: 1, name: 'Aseguradora Test', active: true },
];

const MOCK_CLIENTES = [
  { id: 1, customer_code: '00000001', first_names: 'Juan', last_names: 'Perez', person_type: 'individual', birth_date: '1990-01-01', document_number: '1105316663', is_active: true },
  { id: 2, customer_code: '00000002', first_names: 'EMPRESA XYZ S.A.', last_names: 'S.A.', person_type: 'legal_entity', document_number: '1792146739001', is_active: true },
];

const MOCK_VEHICULOS = [
  { id: 1, owner_customer: 1, license_plate: 'PDA123', brand: 'Toyota', model: 'Corolla', year: 2020, is_active: true },
  { id: 2, owner_customer: 2, license_plate: 'GYE1234', brand: 'Chevrolet', model: 'D-Max', year: 2024, is_active: true },
];

describe('CotizacionFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClientes as any).mockResolvedValue(MOCK_CLIENTES);
    (getVehiculos as any).mockResolvedValue(MOCK_VEHICULOS);
    (getAseguradoras as any).mockResolvedValue(MOCK_ASEGURADORAS);
  });

  it('no se renderiza si no esta abierto', () => {
    const { container } = render(<CotizacionFormModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza y carga clientes, aseguradoras y vehiculos', async () => {
    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/00000001 - Juan Perez/i)).toBeInTheDocument();
      expect(screen.getByText(/00000002 - EMPRESA XYZ S.A. S.A./i)).toBeInTheDocument();
      expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText(/GYE1234 - Chevrolet D-Max/i)).toBeInTheDocument();
    });
  });

  it('crea borrador con estructura multi-vehiculo', async () => {
    (createCotizacionDraft as any).mockResolvedValue({});

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
    });

    await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

    await waitFor(() => expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/guardar borrador/i));
    });

    expect(createCotizacionDraft).toHaveBeenCalledWith({
      insured_client: 1,
      insurer: 1,
      vehicles: [{ vehicle: 1 }],
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('crea con scoring ML con estructura multi-vehiculo', async () => {
    (createCotizacionML as any).mockResolvedValue({});

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
    });

    await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

    await waitFor(() => expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/crear con scoring ml/i));
    });

    expect(createCotizacionML).toHaveBeenCalledWith({
      insured_client: 1,
      insurer: 1,
      vehicles: [{ vehicle: 1 }],
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('envia valor y motivo solo cuando hay ajuste manual', async () => {
    (createCotizacionDraft as any).mockResolvedValue({});

    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

    await waitFor(() => expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/valor asegurado/i, { selector: 'select' }), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText(/valor asegurado ajustado/i), { target: { value: '21000.00' } });
    fireEvent.change(screen.getByLabelText(/motivo del ajuste/i), { target: { value: 'Avalúo comercial revisado' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/guardar borrador/i));
    });

    expect(createCotizacionDraft).toHaveBeenCalledWith({
      insured_client: 1,
      insurer: 1,
      vehicles: [{ vehicle: 1, vehicle_value: '21000.00', vehicle_value_override_reason: 'Avalúo comercial revisado' }],
    });
  });

  it('muestra non_field_errors como error de negocio sin pedir campos en rojo', async () => {
    (createCotizacionML as any).mockRejectedValue({
      message: 'Invalid data.',
      fieldErrors: {
        non_field_errors: 'An open quote already exists for this client and vehicle. Approve or reject it before creating a new one.',
      },
    });

    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

    await waitFor(() => expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/crear con scoring ml/i));
    });
    expect(screen.getByText(/no es posible realizar cotizaciones/i)).toBeInTheDocument();
    expect(screen.queryByText(/campos marcados en rojo/i)).not.toBeInTheDocument();
  });

  it('traduce el mensaje generico Invalid data cuando no hay campos para marcar', async () => {
    (createCotizacionML as any).mockRejectedValue({
      message: 'Invalid data.',
      fieldErrors: {},
    });

    await act(async () => {
      render(<CotizacionFormModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

    await waitFor(() => expect(screen.getByText(/PDA123 - Toyota Corolla/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /crear con scoring ml/i }));
    });

    expect(await screen.findByText(/no se pudo crear/i)).toBeInTheDocument();
    expect(screen.queryByText(/invalid data/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/campos marcados en rojo/i)).not.toBeInTheDocument();
  });
});