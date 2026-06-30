/// <summary>
/// Componente ComplexModals.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClienteFormModal from '../pages/Clientes/components/ClienteFormModal';
import VehiculoFormModal from '../pages/Vehiculos/components/VehiculoFormModal';
import TallerFormModal from '../pages/Talleres/components/TallerFormModal';
import * as talleresService from '../services/talleres.service';

vi.mock('../services/geo.service', () => ({
  fetchCountries: vi.fn().mockResolvedValue([{ name: 'Ecuador', iso2: 'EC' }]),
  fetchStates: vi.fn().mockResolvedValue([{ name: 'Pichincha', state_code: 'PI' }]),
  fetchCities: vi.fn().mockResolvedValue([{ name: 'Quito' }]),
}));
vi.mock('../services/clientes.service', () => ({ getClientes: vi.fn().mockResolvedValue([]), createCliente: vi.fn().mockResolvedValue({ id: 1 }), updateCliente: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../services/vehiculos.service', () => ({ getVehiculos: vi.fn().mockResolvedValue([]), createVehiculo: vi.fn().mockResolvedValue({ id: 1 }), updateVehiculo: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../services/talleres.service', () => ({ getTalleres: vi.fn().mockResolvedValue([]), createTaller: vi.fn().mockResolvedValue({ id: 1 }), updateTaller: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../services/aseguradoras.service', () => ({ getAseguradoras: vi.fn().mockResolvedValue([]) }));

describe('Consolidated Modal Tests', () => {
  const defaultProps = { isOpen: true, onClose: vi.fn(), onSaveSuccess: vi.fn(), canMutate: true };
  beforeEach(() => vi.clearAllMocks());

  it('ClienteFormModal renderiza contrato nuevo', async () => {
    render(<ClienteFormModal {...defaultProps} />);
    expect(await screen.findByLabelText(/numero de documento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de persona/i)).toBeInTheDocument();
  });

  it('VehiculoFormModal renderiza tabs', async () => {
    render(<VehiculoFormModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/ubicacion/i));
    expect(await screen.findByLabelText(/provincia/i)).toBeInTheDocument();
  });

  it('TallerFormModal registra', async () => {
    render(<TallerFormModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Test Taller' } });
    fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
    fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Test 123' } });
    fireEvent.change(screen.getByLabelText(/telefono oficina/i), { target: { name: 'phone', value: '022345678' } });
    fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));
    fireEvent.change(screen.getByLabelText(/ejecutivo de contacto/i), { target: { name: 'contact_executive', value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/telefono del ejecutivo/i), { target: { name: 'executive_phone', value: '0991234567' } });
    fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));
    await waitFor(() => expect(talleresService.createTaller).toHaveBeenCalled());
  });
});