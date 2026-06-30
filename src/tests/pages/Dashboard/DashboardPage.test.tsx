/// <summary>
/// Componente DashboardPage.test.tsx
/// </summary>
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: () => <div />,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
}));

import DashboardPage from '../../../pages/Dashboard/DashboardPage';
import { getDashboardSummary } from '../../../services/dashboard.service';

vi.mock('../../../services/dashboard.service', () => ({
    getDashboardSummary: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...(actual as any), useNavigate: () => vi.fn() };
});

const MOCK_SUMMARY = {
    metrics: {
        total_customers: 10,
        active_customers: 8,
        total_vehicles: 5,
        active_vehicles: 4,
        quotes_generated: 3,
        quotes_pending: 1,
        quotes_approved: 2,
        active_policies: 6,
        draft_policies: 1,
        policies_pending_document: 2,
        open_claims: 0,
    },
    business_indicators: {
        period: 'month',
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        quotes_count: 5,
        approved_quotes_count: 3,
        quote_conversion_rate: '60.00',
        policies_count: 4,
        claims_count: 1,
        total_insured_value_active_policies: '150000.00',
        total_premium_active_policies: '3200.00',
    },
    alerts: [
        {
            type: 'policy_expiring',
            title: 'Póliza próxima a vencer',
            message: 'La póliza #5 vence pronto',
            resource: 'policy',
            resource_id: 5,
            due_date: '2026-06-30',
            severity: 'warning',
        },
    ],
    recent_activity: [
        { type: 'quote_created', message: 'Cotización generada para Cliente A', resource: 'quote', resource_id: 1, created_at: '2026-06-08T10:00:00Z' },
        { type: 'customer_created', message: 'Nuevo cliente registrado', resource: 'customer', resource_id: 2, created_at: '2026-06-07T09:00:00Z' },
        { type: 'policy_updated', message: 'Póliza actualizada', resource: 'policy', resource_id: 3, created_at: '2026-06-06T08:00:00Z' },
    ],
    quick_actions: [{ key: 'new_quote', label: 'Nueva cotización' }, { key: 'new_customer', label: 'Nuevo cliente' }],
};

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getDashboardSummary as any).mockResolvedValue(MOCK_SUMMARY);
    });

    it('muestra el título principal', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        expect(screen.getByText('Resumen General')).toBeInTheDocument();
    });

    it('renderiza las tarjetas de métricas principales', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByText('Clientes activos')).toBeInTheDocument();
            expect(screen.getByText('Vehículos activos')).toBeInTheDocument();
            expect(screen.getByText('Pólizas activas')).toBeInTheDocument();
        });
    });

    it('muestra los indicadores del mes', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByText('Cotizaciones del mes')).toBeInTheDocument();
            expect(screen.getByText('Tasa de conversión')).toBeInTheDocument();
        });
    });

    it('muestra actividad reciente en panel de 2 columnas', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByText('Actividad reciente')).toBeInTheDocument();
            expect(screen.getByText('Cotización generada')).toBeInTheDocument();
            expect(screen.getByText('Cliente registrado')).toBeInTheDocument();
        });

        const activityGrid = document.querySelector('.dashboard-activity-grid');
        expect(activityGrid).not.toBeNull();
    });

    it('NO muestra el panel Alertas en el dashboard (ha sido movido al Header)', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {

            expect(screen.getByText('Actividad reciente')).toBeInTheDocument();
        });

        expect(screen.queryByText('Alertas')).not.toBeInTheDocument();
    });

    it('muestra acciones rápidas cuando las hay', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByText('Nueva cotización')).toBeInTheDocument();
            expect(screen.getByText('Nuevo cliente')).toBeInTheDocument();
        });
    });

    it('muestra estado vacío de actividad cuando no hay datos', async () => {
        (getDashboardSummary as any).mockResolvedValue({ ...MOCK_SUMMARY, recent_activity: [] });
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByText('Sin actividad reciente.')).toBeInTheDocument();
        });
    });

    it('muestra error cuando falla la API', async () => {
        (getDashboardSummary as any).mockRejectedValue(new Error('Fallo de red'));
        await act(async () => {
            render(<MemoryRouter><DashboardPage /></MemoryRouter>);
        });
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/fallo de red/i)).toBeInTheDocument();
        });
    });
});