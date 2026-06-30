/// <summary>
/// UsersPage.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from '../../../pages/Users/UsersPage';
import { getUsersPage, activateUser, deactivateUser } from '../../../services/users.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/users.service', () => ({
    getUsersPage: vi.fn(),
    activateUser: vi.fn(),
    deactivateUser: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const MOCK_USERS = {
    count: 1,
    next: null,
    previous: null,
    results: [{
        id: 1,
        username: 'admin',
        first_name: 'Admin',
        last_name: 'Test',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true,
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
            <UsersPage />
        </MemoryRouter>
    );

describe('UsersPage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getUsersPage as any).mockResolvedValue(MOCK_USERS);
        (AuthContextModule.useAuth as any).mockReturnValue(MOCK_AUTH_CONTEXT);
    });

    it('renderiza la tabla y filtra por rol', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('admin')).toBeInTheDocument();
        });

        // Filtro rol
        fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'quote_technician' } });
        fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
        
        await waitFor(() => {
            expect(getUsersPage).toHaveBeenCalledWith(expect.objectContaining({ role: 'quote_technician' }));
        });

        // Filtro estado (activeFilter)
        fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'false' } });
        fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
        
        await waitFor(() => {
            expect(getUsersPage).toHaveBeenCalledWith(expect.objectContaining({ is_active: 'false' }));
        });
    });

    it('abre el modal para nuevo usuario', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
        expect(screen.getByRole('heading', { name: /nuevo usuario/i })).toBeInTheDocument();
    });

    it('abre el modal para editar usuario', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument());
        
        const editBtns = screen.getAllByRole('button', { name: /editar/i });
        fireEvent.click(editBtns[0]);
        expect(screen.getByRole('heading', { name: /editar usuario/i })).toBeInTheDocument();
    });

    it('activa y desactiva usuario', async () => {
        // Desactivar
        (deactivateUser as any).mockResolvedValueOnce({});
        renderPage();
        await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument());
        
        fireEvent.click(screen.getByRole('button', { name: /desactivar/i }));
        
        const confirmBtns = screen.getAllByRole('button', { name: 'Desactivar', hidden: true });
        fireEvent.click(confirmBtns.at(-1)!);
        
        await waitFor(() => {
            expect(deactivateUser).toHaveBeenCalledWith(1);
        });

        // Activar - mockeamos datos inactivos
        (getUsersPage as any).mockResolvedValueOnce({
            ...MOCK_USERS,
            results: [{ ...MOCK_USERS.results[0], is_active: false }]
        });
        (activateUser as any).mockResolvedValueOnce({});
        
        renderPage();
        await waitFor(() => expect(screen.getAllByRole('button', { name: /activar/i }).length).toBeGreaterThan(0));
        
        const activateBtns = screen.getAllByRole('button', { name: /activar/i });
        fireEvent.click(activateBtns.at(-1)!);
        
        const confirmActBtns = screen.getAllByRole('button', { name: 'Activar', hidden: true });
        fireEvent.click(confirmActBtns.at(-1)!);
        
        await waitFor(() => {
            expect(activateUser).toHaveBeenCalledWith(1);
        });
    });

    it('maneja errores de la api', async () => {
        (getUsersPage as any).mockRejectedValueOnce({ message: 'Network error' });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('No se pudo cargar la lista: Network error')).toBeInTheDocument();
        });
    });
});
