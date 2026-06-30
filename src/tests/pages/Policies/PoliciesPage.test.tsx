/// <summary>
/// Componente PoliciesPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import PoliciesPage from '../../../pages/Policies/PoliciesPage';

vi.mock('../../../services/policies.service', () => ({
    getPoliciesPage: vi.fn(),
    activatePolicy: vi.fn(),
    deactivatePolicy: vi.fn(),
}));

vi.mock('../../../services/aseguradoras.service', () => ({
    getAseguradoras: vi.fn(),
}));

vi.mock('../../../services/clientes.service', () => ({
    getClientes: vi.fn(),
}));

import { getPoliciesPage } from '../../../services/policies.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { getClientes } from '../../../services/clientes.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
    const payload = btoa(JSON.stringify({ username: 'test', role }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;

    (getAseguradoras as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 3, name: 'Seguros ABC' }]);
    (getClientes as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 9, customer_code: '00000009', first_names: 'Juan', last_names: 'Perez' }]);

    return render(
        <AuthProvider>
            <MemoryRouter>
                <PoliciesPage />
            </MemoryRouter>
        </AuthProvider>
    );
}

describe('PoliciesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('muestra estado vacio', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));

        renderPage();

        await waitFor(() => expect(screen.queryByText('Cargando sesion...')).not.toBeInTheDocument());
        expect(screen.getByText('Gestión de pólizas')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('No hay pólizas registradas.')).toBeInTheDocument());
    });

    it('renderiza pólizas en tabla', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([{
            id: 1,
            insurer: 3,
            insured_customer: 9,
            policy_number: 'POL-001',
            policy_type: 'individual',
            document_type: 'new',
            valid_from: '2026-06-05',
            valid_until: '2027-06-04',
            total_amount: '575.00',
            status: 'draft',
            is_active: true,
            vehicles: [],
        }]));

        renderPage();

        await waitFor(() => expect(screen.getByText('POL-001')).toBeInTheDocument());
        expect(screen.getByText('Seguros ABC')).toBeInTheDocument();
        expect(screen.getByText(/00000009 - Juan Perez/i)).toBeInTheDocument();
        expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0);
    });

    it('abre el modal al hacer clic en Nueva', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');

        await waitFor(() => expect(screen.queryByText('Cargando sesion...')).not.toBeInTheDocument());

        const btnNew = screen.getByRole('button', { name: /Nueva/i });
        expect(btnNew).toBeInTheDocument();
    });

    it('permite aplicar filtros', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();

        await waitFor(() => expect(screen.queryByText('Cargando sesion...')).not.toBeInTheDocument());

        const statusSelect = screen.getByLabelText('Estado');
        expect(statusSelect).toBeInTheDocument();

        const typeSelect = screen.getByLabelText('Tipo');
        expect(typeSelect).toBeInTheDocument();

        const submitBtn = screen.getByRole('button', { name: /Buscar/i });
        fireEvent.click(submitBtn);

        await waitFor(() => expect(getPoliciesPage).toHaveBeenCalled());
    });

    it('abre modal al hacer clic en "Ver"', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([{
            id: 1, status: 'draft', policy_number: 'POL-001', insurer: 3, insured_customer: 9, is_active: true, vehicles: []
        }]));
        renderPage();
        await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ver'));
        await waitFor(() => expect(screen.getByText('Detalles de Póliza')).toBeInTheDocument());
    });

    it('abre modal al hacer clic en "Gestionar"', async () => {
        (getPoliciesPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([{
            id: 1, status: 'draft', policy_number: 'POL-001', insurer: 3, insured_customer: 9, is_active: true, vehicles: []
        }]));
        renderPage('admin');
        await waitFor(() => expect(screen.getByText('Gestionar')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Gestionar'));
        await waitFor(() => expect(screen.getByText('Actualizar Póliza')).toBeInTheDocument());
    });
});