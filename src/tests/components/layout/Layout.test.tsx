/// <summary>
/// Componente Layout.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from '../../../components/layout/Sidebar/Sidebar';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Header from '../../../components/layout/Header/Header';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../services/dashboard.service', () => ({
    getDashboardSummary: vi.fn().mockResolvedValue({ alerts: [], recent_activity: [], metrics: {}, business_indicators: {}, quick_actions: [] }),
}));

const MOCK_ALERTS = [
    {
        type: 'policy_expiring',
        title: 'Póliza próxima a vencer',
        message: 'Vence en 5 días',
        resource: 'policy' as const,
        resource_id: 1,
        due_date: '2026-06-15',
        severity: 'warning' as const,
    },
    {
        type: 'claim_open_too_long',
        title: 'Siniestro con tiempo excedido',
        message: 'Lleva más de 30 días abierto',
        resource: 'claim' as const,
        resource_id: 2,
        due_date: null,
        severity: 'critical' as const,
    },
];

describe('Layout Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ currentUser: { role: 'admin', username: 'Test User' }, token: null, logout: vi.fn() });
    });

    it('Sidebar muestra Configuración para admin', () => {
        render(<MemoryRouter><Sidebar /></MemoryRouter>);
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    });

    it('Sidebar oculta Configuración para rol no admin', () => {
        (useAuth as any).mockReturnValue({ currentUser: { role: 'quote_technician' } });
        render(<MemoryRouter><Sidebar /></MemoryRouter>);
        expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('DashboardLayout renderiza base', async () => {
        await act(async () => {
            render(<MemoryRouter><DashboardLayout /></MemoryRouter>);
        });
        expect(screen.getByAltText('SGAC Logo')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('Header muestra badge de notificaciones cuando hay alertas', () => {
        render(<MemoryRouter><Header alerts={MOCK_ALERTS} /></MemoryRouter>);
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
    });

    it('Header abre panel de notificaciones al hacer click en el campana', async () => {
        render(<MemoryRouter><Header alerts={MOCK_ALERTS} /></MemoryRouter>);
        const bellBtn = screen.getByRole('button', { name: /notificaciones/i });
        fireEvent.click(bellBtn);
        await waitFor(() => {
            expect(screen.getByText('Alertas activas')).toBeInTheDocument();
            expect(screen.getByText('Póliza próxima a vencer')).toBeInTheDocument();
            expect(screen.getByText('Siniestro con tiempo excedido')).toBeInTheDocument();
        });
    });

    it('Header muestra estado vacío cuando no hay alertas y se abre el panel', async () => {
        render(<MemoryRouter><Header alerts={[]} /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
        await waitFor(() => {
            expect(screen.getByText('No hay alertas pendientes.')).toBeInTheDocument();
        });
    });

    it('Header no muestra badge cuando no hay alertas', () => {
        render(<MemoryRouter><Header alerts={[]} /></MemoryRouter>);

        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
});