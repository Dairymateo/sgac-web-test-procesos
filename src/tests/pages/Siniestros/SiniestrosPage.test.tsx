/// <summary>
/// Componente SiniestrosPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import SiniestrosPage from '../../../pages/Siniestros/SiniestrosPage';

vi.mock('../../../services/siniestros.service', () => ({
    getSiniestrosPage: vi.fn(),
    activateSiniestro: vi.fn(),
    deactivateSiniestro: vi.fn(),
    reportSiniestroToInsurer: vi.fn(),
}));
vi.mock('../../../services/clientes.service', () => ({
    getClientes: vi.fn(),
}));
vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculos: vi.fn(),
}));

import { getSiniestrosPage, deactivateSiniestro, reportSiniestroToInsurer } from '../../../services/siniestros.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
    const payload = btoa(JSON.stringify({ username: 'test', role }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;

    return render(
        <AuthProvider>
            <MemoryRouter>
                <SiniestrosPage />
            </MemoryRouter>
        </AuthProvider>
    );
}

describe('ClaimReadsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (getClientes as ReturnType<typeof vi.fn>).mockResolvedValue([{
            id: 2,
            customer_code: '00000002',
            person_type: 'individual',
            first_names: 'Juan',
            last_names: 'Perez',
            document_type: 'CC',
            document_number: '1234567890',
            birth_date: '1990-01-01',
            sex: 'male',
            marital_status: 'single',
            occupation: 'private',
            birth_country: '',
            birth_province: '',
            birth_city: '',
            residence_country: '',
            residence_province: '',
            residence_city: '',
            address: '',
            phone_1: '0999999999',
            phone_2: '',
            email: 'juan@test.com',
            email_2: '',
            ruc: '',
            manager_document_number: '',
            spouse_document_number: '',
            insured_id_document: null,
            manager_id_document: null,
            spouse_id_document: null,
            basic_service_bill_document: null,
            incorporation_deed_document: null,
            shareholder_payroll_document: null,
            compliance_certificate_document: null,
            income_tax_return_document: null,
            created_at: '',
            updated_at: '',
        }]);
        (getVehiculos as ReturnType<typeof vi.fn>).mockResolvedValue([{
            id: 3,
            owner_customer: 2,
            brand: 'Toyota',
            model: 'Corolla',
            vehicle_type: 'sedan',
            vehicle_use: 'personal',
            engine: 'ABC12345',
            chassis: 'CHASSIS12345',
            license_plate: 'PBC-1234',
            year: 2024,
            color: 'Blanco',
            province: 'Pichincha',
            city: 'Quito',
            is_active: true,
            created_at: '',
            updated_at: '',
        }]);
    });

    it('muestra estado de carga inicial', async () => {
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => { }));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('Cargando siniestros...')).toBeInTheDocument();
    });

    it('renderiza titulo y mensaje vacio', async () => {
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText(/Gesti.n de siniestros/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No hay siniestros registrados.')).toBeInTheDocument();
        });
    });

    it('renderiza siniestros en la tabla', async () => {
        const mockData = [{
            id: 1,
            insured_customer: 2,
            vehicle: 3,
            insurer: 4,
            workshop: null,
            claim_number: 'SIN-001',
            claim_date: '2023-10-01',
            claim_description: 'Impacto',
            status: 'in_progress',
            damage_type: 'partial',
            vehicle_driver: '',
            insurer_executive: '',
            insurer_executive_phone: '',
            claim_amount: '1500.00',
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
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('SIN-001')).toBeInTheDocument();
            expect(screen.getByText('2023-10-01')).toBeInTheDocument();
            expect(screen.getByText('00000002 - Juan Perez')).toBeInTheDocument();
            expect(screen.getByText('PBC-1234 - Toyota Corolla (2024)')).toBeInTheDocument();
            expect(screen.getAllByText('En progreso').length).toBeGreaterThan(0);
        });
    });

    it('muestra boton Nuevo y permite abrir el modal', async () => {
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const btn = screen.getByRole('button', { name: /^nuevo$/i });
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        await waitFor(() => {
            expect(screen.getAllByText('Registrar Siniestro').length).toBeGreaterThan(0);
        });
    });

    it('permite anular un siniestro', async () => {
        const mockData = [{
            id: 1,
            insured_customer: 2,
            vehicle: 3,
            insurer: 4,
            workshop: null,
            claim_number: 'SIN-001',
            claim_date: '2023-10-01',
            claim_description: 'Impacto',
            status: 'closed',
            damage_type: 'partial',
            vehicle_driver: '',
            insurer_executive: '',
            insurer_executive_phone: '',
            claim_amount: null,
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
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        await waitFor(() => expect(screen.getByText('Anular')).toBeInTheDocument());

        (deactivateSiniestro as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, is_active: false });

        fireEvent.click(screen.getByText('Anular'));
        const dialog = screen.getByRole('dialog', { name: /anular siniestro/i });
        fireEvent.click(within(dialog).getByRole('button', { name: /anular/i }));
        await waitFor(() => {
            expect(deactivateSiniestro).toHaveBeenCalledWith(1);
        });
    });

    it('permite reportar un siniestro a aseguradora si aun no fue reportado', async () => {
        const mockData = [{
            id: 1,
            insured_customer: 2,
            vehicle: 3,
            insurer: 4,
            workshop: null,
            claim_number: 'SIN-001',
            claim_date: '2023-10-01',
            claim_description: 'Impacto',
            status: 'reported',
            damage_type: 'partial',
            vehicle_driver: '',
            insurer_executive: '',
            insurer_executive_phone: '',
            claim_amount: null,
            adjusted_amount: null,
            delivery_status_confirmation: '',
            is_active: true,
            broker_report_date: '2023-10-01',
            insurer_report_date: null,
            documentation_date: null,
            repair_authorization_date: null,
            estimated_departure_date: null,
            payment_date: null,
            documents: [],
            created_at: '',
            updated_at: '',
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        (reportSiniestroToInsurer as ReturnType<typeof vi.fn>).mockResolvedValue({
            ...mockData[0],
            insurer_report_date: '2026-06-03',
            status: 'in_progress',
        });

        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesiÃ³n...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Reportar a aseguradora')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Reportar a aseguradora'));

        await waitFor(() => expect(reportSiniestroToInsurer).toHaveBeenCalledWith(1));
    });

    it('abre modal al hacer clic en "Ver"', async () => {
        const mockData = [{
            id: 1, insured_customer: 2, vehicle: 3, insurer: 4, claim_number: 'SIN-001',
            status: 'reported', damage_type: 'partial', claim_amount: null, is_active: true, documents: []
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ver'));
        await waitFor(() => expect(screen.getByText('Detalles del Siniestro')).toBeInTheDocument());
    });

    it('abre modal al hacer clic en "Editar"', async () => {
        const mockData = [{
            id: 1, insured_customer: 2, vehicle: 3, insurer: 4, claim_number: 'SIN-001',
            status: 'reported', damage_type: 'partial', claim_amount: null, is_active: true, documents: []
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Actualizar')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Actualizar'));
        await waitFor(() => expect(screen.getByText('Actualizar Siniestro')).toBeInTheDocument());
    });

    it('permite aplicar filtros', async () => {
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'SIN-123' } });

        const submitBtn = screen.getByRole('button', { name: /Buscar/i });
        fireEvent.click(submitBtn);

        expect(getSiniestrosPage).toHaveBeenCalled();
    });

    it('permite limpiar filtros y cambiar ordenamiento', async () => {
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'SIN-123' } });

        const clearBtn = screen.getByRole('button', { name: /Limpiar/i });
        fireEvent.click(clearBtn);

        expect(searchInput).toHaveValue('');
        
        const orderingSelect = document.querySelector('select[id$="ordering"]') || screen.getByLabelText(/Ordenar por/i, { exact: false }) as HTMLSelectElement;
        if (orderingSelect) {
            fireEvent.change(orderingSelect, { target: { value: 'status' } });
            expect((orderingSelect as HTMLSelectElement).value).toBe('status');
        }
    });

    it('maneja error al reportar a aseguradora', async () => {
        const mockData = [{
            id: 1, insured_customer: 2, vehicle: 3, insurer: 4, claim_number: 'SIN-001',
            status: 'reported', damage_type: 'partial', claim_amount: null, is_active: true, documents: []
        }];
        (getSiniestrosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        (reportSiniestroToInsurer as ReturnType<typeof vi.fn>).mockRejectedValue({ message: 'Error de servidor' });

        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Reportar a aseguradora')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Reportar a aseguradora'));

        await waitFor(() => expect(screen.getByText('Error al reportar a aseguradora: Error de servidor')).toBeInTheDocument());
        
        const closeErrorBtn = screen.getByRole('button', { name: /Cerrar/i });
        fireEvent.click(closeErrorBtn);
        await waitFor(() => expect(screen.queryByText('Error al reportar a aseguradora: Error de servidor')).not.toBeInTheDocument());
    });
});