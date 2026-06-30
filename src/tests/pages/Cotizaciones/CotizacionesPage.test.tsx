/// <summary>
/// Componente CotizacionesPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CotizacionesPage from '../../../pages/Cotizaciones/CotizacionesPage';
import { getCotizacionesPage, generateScoring } from '../../../services/cotizaciones.service';
import { getVehiculo } from '../../../services/vehiculos.service';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../services/cotizaciones.service', () => ({
    getCotizacionesPage: vi.fn(),
    generateScoring: vi.fn(),
}));

vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculo: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

describe('CotizacionesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ currentUser: { role: 'admin' } });
        (getVehiculo as any).mockResolvedValue({ id: 999, license_plate: 'MOCK-000' });
    });

    it('renderiza titulo y boton', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([]));
        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);
        expect(screen.getByText(/gesti.n de cotizaciones/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^nueva$/i })).toBeInTheDocument();
    });

    it('carga y muestra data con placa en campo superior', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            {
                id: 1,
                insured_client: 101,
                customer_code: '00000001',
                vehicles: [{ vehicle: 3, license_plate: 'ABC-123', brand: 'Toyota', model: 'Corolla' }],
                status: 'draft',
                suggested_premium: '150.0',
                final_premium: '150.0',
                risk_score: 'A',
                risk_band: 'Low',
            },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getAllByText(/borrador/i).length).toBeGreaterThan(0);
            expect(screen.getByText('00000001')).toBeInTheDocument();
            expect(screen.getByText('Toyota Corolla - ABC-123')).toBeInTheDocument();
        });
    });

    it('muestra error si API falla', async () => {
        (getCotizacionesPage as any).mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);
        });

        await waitFor(() => {
            expect(screen.getByText(/error al cargar datos: network error/i)).toBeInTheDocument();
        });
    });

    it('llama a generateScoring al hacer clic en Score y recarga', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            {
                id: 1,
                insured_client: 101,
                status: 'draft',
                customer_code: '00000001',
                vehicle_license_plate: 'ABC-123',
                suggested_premium: null,
                final_premium: '100.0',
                risk_score: 'A',
                risk_band: 'LOW',
            },
        ]));
        (generateScoring as any).mockResolvedValue({});

        await act(async () => {
            render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);
        });

        await waitFor(() => expect(screen.getByText(/score/i)).toBeInTheDocument());

        await act(async () => { fireEvent.click(screen.getByText(/score/i)); });

        const dialog = screen.getByRole('dialog', { name: /generar scoring/i });
        await act(async () => {
            fireEvent.click(within(dialog).getByRole('button', { name: /generar/i }));
        });

        expect(generateScoring).toHaveBeenCalledWith(1);
        expect(getCotizacionesPage).toHaveBeenCalledTimes(2);
    });

    it('muestra solo Score y Rechazar para estado draft', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            { id: 4, insured_client: 101, customer_code: '00000001', vehicle_license_plate: 'ABC-123', status: 'draft', suggested_premium: null, final_premium: null, risk_score: null, risk_band: null },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getByText(/^Score$/i)).toBeInTheDocument();
            expect(screen.getByText(/rechazar/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/ajustar/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/aprobar/i)).not.toBeInTheDocument();
    });

    it('muestra acciones correctas para scoring_generated', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            { id: 2, insured_client: 11, customer_code: '00000011', vehicle_license_plate: 'PBC-1122', status: 'scoring_generated', suggested_premium: '300.0', final_premium: null, risk_score: '0.45', risk_band: 'MEDIUM' },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getAllByText(/scoring generado/i).length).toBeGreaterThan(0);
            expect(screen.getByText(/ajustar/i)).toBeInTheDocument();
            expect(screen.getByText(/aprobar/i)).toBeInTheDocument();
            expect(screen.getByText(/rechazar/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/^Score$/i)).not.toBeInTheDocument();
    });

    it('muestra solo ver para estado approved', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            { id: 3, insured_client: 12, customer_code: '00000012', vehicle_license_plate: 'XYZ-999', status: 'approved', suggested_premium: '300.0', final_premium: '290.0', risk_score: '0.12', risk_band: 'LOW' },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getAllByText(/aprobada/i).length).toBeGreaterThan(0);
            expect(screen.getByText(/^Ver$/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/ajustar/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/aprobar/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/rechazar/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Score$/i)).not.toBeInTheDocument();
    });

    it('muestra la placa desde vehicles[0] usando formato completo cuando esta disponible', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            {
                id: 10,
                insured_client: 1,
                customer_code: '00000001',
                vehicle_license_plate: null,
                vehicles: [{ vehicle: 5, brand: 'Chevrolet', model: 'Spark', license_plate: 'GYE-5678' }],
                status: 'draft',
                suggested_premium: null,
                final_premium: null,
            },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getByText('Chevrolet Spark - GYE-5678')).toBeInTheDocument();
        });
    });

    it('enriquece la placa desde getVehiculo mostrando detalles completos', async () => {
        (getVehiculo as any).mockResolvedValue({ id: 7, brand: 'Toyota', model: 'Yaris', year: 2020, license_plate: 'PBC-7777' });
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            {
                id: 12,
                insured_client: 1,
                customer_code: '00000001',
                vehicle_license_plate: null,
                vehicles: [{ vehicle: 7 }],   
                status: 'draft',
                suggested_premium: null,
                final_premium: null,
            },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(getVehiculo).toHaveBeenCalledWith(7);
            expect(screen.getByText('Toyota Yaris (2020) - PBC-7777')).toBeInTheDocument();
        });
    });

    it('muestra — cuando no hay ninguna referencia de vehículo', async () => {
        (getCotizacionesPage as any).mockResolvedValue(pageOf([
            {
                id: 11,
                insured_client: 1,
                customer_code: '00000001',
                vehicle_license_plate: null,
                vehicles: [],
                status: 'draft',
                suggested_premium: null,
                final_premium: null,
            },
        ]));

        render(<MemoryRouter><CotizacionesPage /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getByText('—')).toBeInTheDocument();
        });
    });
});