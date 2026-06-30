/// <summary>
/// Componente Pages.test.tsx
/// </summary>
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../context/AuthContext';
import ClientesPage from '../pages/Clientes/ClientesPage';
import UsersPage from '../pages/Users/UsersPage';
import VehiculosPage from '../pages/Vehiculos/VehiculosPage';
import TalleresPage from '../pages/Talleres/TalleresPage';
import SiniestrosPage from '../pages/Siniestros/SiniestrosPage';
import * as clientesService from '../services/clientes.service';
import * as usersService from '../services/users.service';
import * as vehiculosService from '../services/vehiculos.service';
import * as talleresService from '../services/talleres.service';
import * as siniestrosService from '../services/siniestros.service';
import * as cotizacionesService from '../services/cotizaciones.service';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/clientes.service');
vi.mock('../services/users.service');
vi.mock('../services/vehiculos.service');
vi.mock('../services/talleres.service');
vi.mock('../services/siniestros.service');
vi.mock('../services/cotizaciones.service', () => ({ getCotizacionesPage: vi.fn() }));

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

describe('Pages Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ currentUser: { role: 'admin', is_staff: true } });
  });

  it('ClientesPage renderiza con datos', async () => {
    (clientesService.getClientesPage as any).mockResolvedValue(pageOf([{ id: 1, first_names: 'Juan', last_names: 'Perez', document_number: '123', phone_1: '099' }]));
    render(<MemoryRouter><ClientesPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
  });

  it('UsersPage renderiza con datos', async () => {
    (usersService.getUsersPage as any).mockResolvedValue(pageOf([{ id: 1, username: 'user1', email: 'user@test.com', role: 'admin', is_active: true, date_joined: '', created_at: '', updated_at: '' }]));
    render(<MemoryRouter><UsersPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('user@test.com')).toBeInTheDocument());
  });

  it('VehiculosPage renderiza con datos', async () => {
    (vehiculosService.getVehiculosPage as any).mockResolvedValue(pageOf([{
      id: 1,
      owner_customer: 1,
      brand: 'Toyota',
      model: 'Corolla',
      vehicle_type: 'sedan',
      vehicle_use: 'personal',
      engine: 'ENG12345',
      chassis: 'CHASSIS12345',
      license_plate: 'ABC-123',
      year: 2024,
      color: 'BLANCO',
      province: 'PICHINCHA',
      city: 'QUITO',
      is_active: true,
    }]));
    (clientesService.getClientes as any).mockResolvedValue([{ id: 1, first_names: 'A', last_names: 'B' }]);
    (cotizacionesService.getCotizacionesPage as any).mockResolvedValue(pageOf([]));
    render(<MemoryRouter><VehiculosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());
  });

  it('TalleresPage renderiza con datos', async () => {
    (talleresService.getTalleresPage as any).mockResolvedValue(pageOf([{ id: 1, name: 'Taller 1', address: 'Calle 1' }]));
    render(<MemoryRouter><TalleresPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Taller 1')).toBeInTheDocument());
  });

  it('SiniestrosPage renderiza con datos', async () => {
    (siniestrosService.getSiniestrosPage as any).mockResolvedValue(pageOf([{
      id: 1,
      insured_customer: 1,
      vehicle: 1,
      insurer: null,
      workshop: null,
      claim_number: 'SN-001',
      claim_date: '2026-01-01',
      claim_description: 'Impacto',
      status: 'reported',
      damage_type: 'partial',
      vehicle_driver: '',
      insurer_executive: '',
      insurer_executive_phone: '',
      claim_amount: '100',
      adjusted_amount: null,
      delivery_status_confirmation: '',
      is_active: true,
      broker_report_date: null,
      insurer_report_date: null,
      documentation_date: null,
      repair_authorization_date: null,
      estimated_departure_date: null,
      payment_date: null,
      documents: [],
      created_at: '',
      updated_at: '',
    }]));
    (clientesService.getClientes as any).mockResolvedValue([{ id: 1, customer_code: '00000001', first_names: 'A', last_names: 'B' }]);
    (vehiculosService.getVehiculos as any).mockResolvedValue([{ id: 1, license_plate: 'ABC-123', brand: 'Toyota', model: 'Corolla', year: 2024 }]);
    render(<MemoryRouter><SiniestrosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('SN-001')).toBeInTheDocument());
  });
});