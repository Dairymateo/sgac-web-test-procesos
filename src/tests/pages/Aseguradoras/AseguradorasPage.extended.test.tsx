/// <summary>
/// AseguradorasPage.extended.test.tsx — coverage extension
/// </summary>
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AseguradorasPage from '../../../pages/Aseguradoras/AseguradorasPage';
import { getAseguradorasPage, activateAseguradora, deactivateAseguradora } from '../../../services/aseguradoras.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/aseguradoras.service', () => ({
    getAseguradorasPage: vi.fn(),
    activateAseguradora: vi.fn(),
    deactivateAseguradora: vi.fn(),
}));

const MOCK_AUTH_CONTEXT = {
    isAuthenticated: true,
    currentUser: { id: 1, username: 'admin', role: 'admin' },
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    checkAuth: vi.fn(),
};

const MOCK_ASEGURADORAS = {
    count: 2,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            name: 'Aseguradora Activa',
            insurer_code: 'ASEG-001',
            document_number: '1791234567001',
            is_active: true,
            city: 'Quito',
            phone: '0991234567',
            workshops_summary: [{ id: 1, name: 'Taller Norte', is_active: true }]
        },
        {
            id: 2,
            name: 'Aseguradora Inactiva',
            insurer_code: 'ASEG-002',
            document_number: '1797654321001',
            is_active: false,
            city: 'Guayaquil',
            phone: '0981234567',
            workshops_summary: []
        }
    ],
};

const renderPage = () =>
    render(
        <MemoryRouter>
            <AseguradorasPage />
        </MemoryRouter>
    );

describe('AseguradorasPage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getAseguradorasPage as any).mockResolvedValue(MOCK_ASEGURADORAS);
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(MOCK_AUTH_CONTEXT as any);
    });

    it('renderiza la tabla y filtra por ciudad y estado', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Aseguradora Activa')).toBeInTheDocument();
            expect(screen.getByText('Taller Norte')).toBeInTheDocument(); // Comprueba mapeo de talleres
        });

        // Filtro estado (activeFilter)
        fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'false' } });
        fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
        
        await waitFor(() => {
            expect(getAseguradorasPage).toHaveBeenCalledWith(expect.objectContaining({ is_active: 'false' }));
        });

        // Filtro ciudad
        fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { value: 'Quito' } });
        fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

        await waitFor(() => {
            expect(getAseguradorasPage).toHaveBeenCalledWith(expect.objectContaining({ city: 'Quito' }));
        });
    });

    it('abre el modal de ver aseguradora', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Aseguradora Activa')).toBeInTheDocument());
        
        const viewBtns = screen.getAllByRole('button', { name: /ver/i });
        fireEvent.click(viewBtns[0]);
        
        expect(screen.getByText('Detalles de Aseguradora')).toBeInTheDocument();
    });

    it('abre el modal de nueva aseguradora', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Aseguradora Activa')).toBeInTheDocument());
        
        const newBtn = screen.getByRole('button', { name: /nueva/i });
        fireEvent.click(newBtn);
        
        expect(screen.getByText('Registrar Aseguradora')).toBeInTheDocument();
    });

    it('maneja el flujo de activar y desactivar aseguradora', async () => {
        (deactivateAseguradora as any).mockResolvedValueOnce({});
        (activateAseguradora as any).mockResolvedValueOnce({});
        renderPage();
        await waitFor(() => expect(screen.getByText('Aseguradora Activa')).toBeInTheDocument());
        
        // Desactivar la primera (que esta activa)
        const deactivateBtns = screen.getAllByRole('button', { name: /desactivar/i });
        fireEvent.click(deactivateBtns[0]);
        
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        
        const dialog1 = screen.getByRole('dialog');
        const confirmDeactivate = within(dialog1).getByRole('button', { name: 'Desactivar' });
        fireEvent.click(confirmDeactivate);
        
        await waitFor(() => {
            expect(deactivateAseguradora).toHaveBeenCalledWith(1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        // Activar la segunda (que esta inactiva)
        const activateBtns = screen.getAllByRole('button', { name: /^activar$/i });
        fireEvent.click(activateBtns[0]);
        
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        
        const dialog2 = screen.getByRole('dialog');
        const confirmActivate = within(dialog2).getByRole('button', { name: 'Activar' });
        fireEvent.click(confirmActivate);
        
        await waitFor(() => {
            expect(activateAseguradora).toHaveBeenCalledWith(2);
        });
    });

    it('maneja errores de la api al cargar', async () => {
        (getAseguradorasPage as any).mockRejectedValueOnce({ message: 'Network error' });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Error al cargar datos: Network error')).toBeInTheDocument();
        });
    });

    it('ignora el toggle status si es error global', async () => {
        (deactivateAseguradora as any).mockRejectedValueOnce({ isGlobal: true });
        renderPage();
        await waitFor(() => expect(screen.getByText('Aseguradora Activa')).toBeInTheDocument());
        
        const deactivateBtns = screen.getAllByRole('button', { name: /desactivar/i });
        fireEvent.click(deactivateBtns[0]);
        
        const confirmDeactivate = screen.getAllByRole('button', { name: 'Desactivar', hidden: true });
        fireEvent.click(confirmDeactivate.at(-1)!);
        
        await waitFor(() => {
            expect(deactivateAseguradora).toHaveBeenCalledWith(1);
        });
        
        // No deberia pintar ningun error local extra
        expect(screen.queryByText(/Error al desactivar/i)).not.toBeInTheDocument();
    });
});
