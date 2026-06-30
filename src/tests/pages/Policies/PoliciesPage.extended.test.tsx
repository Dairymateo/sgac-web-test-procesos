/// <summary>
/// PoliciesPage.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PoliciesPage from '../../../pages/Policies/PoliciesPage';
import { getPoliciesPage, activatePolicy, deactivatePolicy, getPolicy } from '../../../services/policies.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { getClientes } from '../../../services/clientes.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/policies.service', () => ({
    getPoliciesPage: vi.fn(),
    activatePolicy: vi.fn(),
    deactivatePolicy: vi.fn(),
    getPolicy: vi.fn(),
}));
vi.mock('../../../services/aseguradoras.service', () => ({ getAseguradoras: vi.fn() }));
vi.mock('../../../services/clientes.service', () => ({ getClientes: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const MOCK_POLICIES = {
    count: 1,
    next: null,
    previous: null,
    results: [{
        id: 1,
        policy_number: 'POL-123',
        insurer: 1,
        insured_customer: 1,
        policy_type: 'individual',
        document_type: 'new',
        status: 'draft',
        total_amount: '1000.00',
        valid_from: '2024-01-01',
        valid_until: '2025-01-01',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
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
            <PoliciesPage />
        </MemoryRouter>
    );

describe('PoliciesPage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getPoliciesPage as any).mockResolvedValue(MOCK_POLICIES);
        (getAseguradoras as any).mockResolvedValue([{ id: 1, name: 'Aseguradora Test' }]);
        (getClientes as any).mockResolvedValue([{ id: 1, first_names: 'Juan', last_names: 'Perez', customer_code: 'CLI-001' }]);
        (AuthContextModule.useAuth as any).mockReturnValue(MOCK_AUTH_CONTEXT);
    });

    it('renderiza la tabla y filtra por documento y registro', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('POL-123')).toBeInTheDocument();
        });

        // Filtro documento
        fireEvent.change(screen.getByLabelText(/documento/i), { target: { value: 'renewal' } });
        await waitFor(() => {
            expect(getPoliciesPage).toHaveBeenCalledWith(expect.objectContaining({ document_type: 'renewal' }));
        });

        // Filtro registro (activeFilter)
        fireEvent.change(screen.getByLabelText(/registro/i), { target: { value: 'false' } });
        await waitFor(() => {
            expect(getPoliciesPage).toHaveBeenCalledWith(expect.objectContaining({ is_active: 'false' }));
        });
    });

    it('abre el modal para nueva poliza', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('POL-123')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /nueva/i }));
        expect(screen.getByText(/informacion general/i)).toBeInTheDocument();
    });

    it('abre el modal para editar poliza', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('POL-123')).toBeInTheDocument());

        // Clic en Gestionar
        const editBtns = screen.getAllByRole('button', { name: /gestionar/i });
        fireEvent.click(editBtns[0]);
        expect(screen.getByText(/informacion general/i)).toBeInTheDocument();
    });

    it('abre el modal para ver poliza', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('POL-123')).toBeInTheDocument());

        // Clic en Ver
        const viewBtns = screen.getAllByRole('button', { name: /ver/i });
        fireEvent.click(viewBtns[0]);
        expect(screen.getByText(/informacion general/i)).toBeInTheDocument();

        const editBtns = screen.getAllByRole('button', { name: /gestionar/i, hidden: true });
        expect(editBtns.at(-1)!).toBeInTheDocument();
    });

    it('activa y desactiva poliza', async () => {
        // Desactivar
        (deactivatePolicy as any).mockResolvedValueOnce({});
        renderPage();
        await waitFor(() => expect(screen.getByText('POL-123')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /desactivar/i }));

        // Confirm dialog shows
        const confirmBtns = screen.getAllByRole('button', { name: 'Desactivar', hidden: true });
        const confirmBtn = confirmBtns.at(-1)!;
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(deactivatePolicy).toHaveBeenCalledWith(1);
        });

        // Activar - mockeamos datos inactivos
        (getPoliciesPage as any).mockResolvedValueOnce({
            ...MOCK_POLICIES,
            results: [{ ...MOCK_POLICIES.results[0], is_active: false }]
        });
        (activatePolicy as any).mockResolvedValueOnce({});

        // Re-render with inactive policy to hit activate path
        renderPage();
        await waitFor(() => expect(screen.getAllByRole('button', { name: /activar/i }).length).toBeGreaterThan(0));

        const activateBtns = screen.getAllByRole('button', { name: /activar/i });
        fireEvent.click(activateBtns.at(-1)!);

        const confirmActBtns = screen.getAllByRole('button', { name: 'Activar', hidden: true });
        const confirmActBtn = confirmActBtns.at(-1)!;
        fireEvent.click(confirmActBtn);

        await waitFor(() => {
            expect(activatePolicy).toHaveBeenCalledWith(1);
        });
    });

    it('maneja errores de la api', async () => {
        (getPoliciesPage as any).mockRejectedValueOnce({ message: 'Network error' });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Error al cargar datos: Network error')).toBeInTheDocument();
        });
    });

    it('abre la poliza indicada en URL params', async () => {
        (getPolicy as any).mockResolvedValueOnce(MOCK_POLICIES.results[0]);
        // Simulate url with ?policy=1
        render(
            <MemoryRouter initialEntries={['/policies?policy=1']}>
                <Routes>
                    <Route path="/policies" element={<PoliciesPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getPolicy).toHaveBeenCalledWith(1);
        });
    });
});
