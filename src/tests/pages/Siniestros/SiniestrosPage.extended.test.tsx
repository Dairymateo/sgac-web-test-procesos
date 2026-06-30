/// <summary>
/// SiniestrosPage.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SiniestrosPage from '../../../pages/Siniestros/SiniestrosPage';
import { getSiniestrosPage, deactivateSiniestro, reportSiniestroToInsurer } from '../../../services/siniestros.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/siniestros.service', () => ({
    getSiniestrosPage: vi.fn(),
    deactivateSiniestro: vi.fn(),
    reportSiniestroToInsurer: vi.fn(),
}));
vi.mock('../../../services/clientes.service', () => ({ getClientes: vi.fn() }));
vi.mock('../../../services/vehiculos.service', () => ({ getVehiculos: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const MOCK_SINIESTROS = {
    count: 1,
    next: null,
    previous: null,
    results: [{
        id: 1,
        claim_number: 'SIN-123',
        policy: 1,
        insured_customer: 1,
        vehicle: 1,
        claim_date: '2024-01-01',
        status: 'reported',
        claim_amount: '500.00',
        is_active: true,
        description: 'Choque'
    }],
};

const MOCK_AUTH_CONTEXT = {
    isAuthenticated: true,
    currentUser: { id: 1, username: 'admin', role: 'admin' },
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    checkAuth: vi.fn(),
};

const renderPage = () =>
    render(
        <MemoryRouter>
            <SiniestrosPage />
        </MemoryRouter>
    );

describe('SiniestrosPage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSiniestrosPage as any).mockResolvedValue(MOCK_SINIESTROS);
        (getClientes as any).mockResolvedValue([{ id: 1, first_names: 'Juan', last_names: 'Perez', customer_code: 'CLI-001' }]);
        (getVehiculos as any).mockResolvedValue([{ id: 1, license_plate: 'XYZ-123', brand: 'Toyota', model: 'Corolla', year: 2020 }]);
        (AuthContextModule.useAuth as any).mockReturnValue(MOCK_AUTH_CONTEXT);
    });

    it('renderiza la tabla y filtra por estado y reporte', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('SIN-123')).toBeInTheDocument();
        });

        // Filtro estado
        fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'in_progress' } });
        fireEvent.click(screen.getByRole('button', { name: /buscar/i })); // If it's a form, maybe submit?
        
        await waitFor(() => {
            expect(getSiniestrosPage).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
        });

        // Reportar siniestro
        (reportSiniestroToInsurer as any).mockResolvedValueOnce({});
        const reportBtns = screen.getAllByRole('button', { name: /reportar a aseguradora/i });
        fireEvent.click(reportBtns[0]);
        
        await waitFor(() => {
            expect(reportSiniestroToInsurer).toHaveBeenCalledWith(1);
        });
    });

    it('abre el modal para nuevo siniestro', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('SIN-123')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
        expect(screen.getByText(/registrar siniestro/i)).toBeInTheDocument();
    });

    it('abre el modal para editar siniestro', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('SIN-123')).toBeInTheDocument());
        
        const editBtns = screen.getAllByRole('button', { name: /actualizar/i });
        fireEvent.click(editBtns[0]);
        expect(screen.getByText(/actualizar siniestro/i)).toBeInTheDocument();
    });

    it('abre el modal para ver siniestro', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('SIN-123')).toBeInTheDocument());
        
        const viewBtns = screen.getAllByRole('button', { name: /ver/i });
        fireEvent.click(viewBtns[0]);
        expect(screen.getByText(/detalles del siniestro/i)).toBeInTheDocument();
    });

    it('activa y desactiva siniestro', async () => {
        // Desactivar / Anular
        (deactivateSiniestro as any).mockResolvedValueOnce({});
        renderPage();
        await waitFor(() => expect(screen.getByText('SIN-123')).toBeInTheDocument());
        
        fireEvent.click(screen.getByRole('button', { name: /anular/i }));
        
        const confirmBtns = screen.getAllByRole('button', { name: 'Anular', hidden: true });
        fireEvent.click(confirmBtns.at(-1)!);
        
        await waitFor(() => {
            expect(deactivateSiniestro).toHaveBeenCalledWith(1);
        });
    });

    it('maneja errores de la api', async () => {
        (getSiniestrosPage as any).mockRejectedValueOnce({ message: 'Network error' });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Error al cargar siniestros: Network error')).toBeInTheDocument();
        });
    });
});
