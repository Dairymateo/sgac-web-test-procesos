/// <summary>
/// CotizacionesPage.extended.test.tsx — coverage extension
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CotizacionesPage from '../../../pages/Cotizaciones/CotizacionesPage';
import { getCotizacionesPage, generateScoring, getCotizacionById } from '../../../services/cotizaciones.service';
import { getVehiculo } from '../../../services/vehiculos.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/cotizaciones.service', () => ({
    getCotizacionesPage: vi.fn(),
    generateScoring: vi.fn(),
    getCotizacionById: vi.fn(),
}));

vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculo: vi.fn(),
}));

const MOCK_AUTH_CONTEXT = {
    isAuthenticated: true,
    currentUser: { id: 1, username: 'admin', role: 'admin' },
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    checkAuth: vi.fn(),
};

const MOCK_COTIZACIONES = {
    count: 2,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            customer_code: 'CLI-001',
            status: 'draft',
            suggested_premium: '500',
            final_premium: null,
            vehicles: [
                { vehicle: 101 }
            ]
        },
        {
            id: 2,
            customer_code: 'CLI-002',
            status: 'scoring_generated',
            suggested_premium: '800',
            final_premium: '750',
            vehicles: [
                { vehicle: 102, license_plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla' },
                { vehicle: 103, license_plate: 'XYZ-9876' }
            ]
        }
    ],
};

const renderPage = () =>
    render(
        <MemoryRouter>
            <CotizacionesPage />
        </MemoryRouter>
    );

describe('CotizacionesPage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getCotizacionesPage as any).mockResolvedValue(MOCK_COTIZACIONES);
        (getCotizacionById as any).mockResolvedValue({ id: 1, status: 'draft', customer_code: 'CLI-001' });
        (getVehiculo as any).mockResolvedValue({
            id: 101,
            brand: 'Ford',
            model: 'Fiesta',
            year: 2015,
            license_plate: 'DEF-5678'
        });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(MOCK_AUTH_CONTEXT as any);
    });

    it('renderiza la tabla y enriquece las placas de los vehiculos', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
            expect(screen.getByText('#2')).toBeInTheDocument();
        });

        // Verifica que la placa enriquecida por getVehiculo aparece
        await waitFor(() => {
            expect(screen.getByText(/Ford Fiesta \(2015\) - DEF-5678/i)).toBeInTheDocument();
        });

        // El cotizacion 2 tiene 2 vehiculos pero solo 1 con placa se fetchea, 
        // sin embargo en la UI renderiza la placa si tiene `license_plate` directamente
        expect(screen.getByText('Toyota Corolla - ABC-1234')).toBeInTheDocument();
    });

    it('aplica filtros de estado, prima minima y maxima', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'scoring_generated' } });
        fireEvent.change(screen.getByLabelText(/prima mínima/i), { target: { value: '100' } });
        fireEvent.change(screen.getByLabelText(/prima máxima/i), { target: { value: '1000' } });
        
        fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

        await waitFor(() => {
            expect(getCotizacionesPage).toHaveBeenCalledWith(expect.objectContaining({
                status: 'scoring_generated',
                min_premium: '100',
                max_premium: '1000'
            }));
        });
    });

    it('abre modales correspondientes al hacer click en las acciones', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        // Ver
        fireEvent.click(screen.getAllByRole('button', { name: /ver/i })[0]);
        await waitFor(() => expect(screen.getByText(/Detalles de la Cotización #1/i)).toBeInTheDocument());
        
        // Ajustar (disponible en cotizacion 2: scoring_generated)
        fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));
        await waitFor(() => expect(screen.getByRole('heading', { name: /ajuste manual de prima/i })).toBeInTheDocument());
        
        // Aprobar (disponible en cotizacion 2: scoring_generated)
        fireEvent.click(screen.getByRole('button', { name: /aprobar/i }));
        await waitFor(() => expect(screen.getByRole('heading', { name: /aprobar cotización #2/i })).toBeInTheDocument());
        
        // Rechazar (disponible en ambas)
        fireEvent.click(screen.getAllByRole('button', { name: /rechazar/i })[0]);
        await waitFor(() => expect(screen.getByRole('heading', { name: /rechazar cotización/i })).toBeInTheDocument());
    });

    it('abre modal para crear nueva cotizacion', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /nueva/i }));
        // Dependiendo del modal real, buscamos un texto o rol
        expect(screen.getByRole('heading', { name: /nueva cotización/i })).toBeInTheDocument();
    });

    it('maneja la generacion de scoring', async () => {
        (generateScoring as any).mockResolvedValueOnce({});
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        // Score (disponible en cotizacion 1: draft)
        fireEvent.click(screen.getByRole('button', { name: /score/i }));
        
        // ConfirmDialog
        expect(screen.getByText('Generar scoring')).toBeInTheDocument();
        
        const confirmBtn = screen.getAllByRole('button', { name: 'Generar', hidden: true });
        fireEvent.click(confirmBtn.at(-1)!);

        await waitFor(() => {
            expect(generateScoring).toHaveBeenCalledWith(1);
        });
    });

    it('maneja error al cargar cotizaciones', async () => {
        (getCotizacionesPage as any).mockRejectedValueOnce({ message: 'Network error' });
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Error al cargar datos: Network error')).toBeInTheDocument();
        });
    });

    it('maneja error global al generar scoring ignorandolo', async () => {
        (generateScoring as any).mockRejectedValueOnce({ isGlobal: true });
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /score/i }));
        
        const confirmBtn = screen.getAllByRole('button', { name: 'Generar', hidden: true });
        fireEvent.click(confirmBtn.at(-1)!);

        await waitFor(() => {
            expect(generateScoring).toHaveBeenCalledWith(1);
        });

        // No debe aparecer un action-error local
        expect(screen.queryByText(/El servicio de cotización ha fallado/i)).not.toBeInTheDocument();
    });

    it('maneja error local al generar scoring', async () => {
        (generateScoring as any).mockRejectedValueOnce({ message: 'Internal Server Error' });
        renderPage();
        await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /score/i }));
        
        const confirmBtn = screen.getAllByRole('button', { name: 'Generar', hidden: true });
        fireEvent.click(confirmBtn.at(-1)!);

        await waitFor(() => {
            expect(screen.getByText('El servicio de cotización ha fallado. Por favor, inténtelo de nuevo más tarde.')).toBeInTheDocument();
        });
    });
});
