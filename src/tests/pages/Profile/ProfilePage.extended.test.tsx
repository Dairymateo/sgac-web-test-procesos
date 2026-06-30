/// <summary>
/// ProfilePage.extended.test.tsx — coverage extension
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../../../pages/Profile/ProfilePage';
import { partialUpdateUser } from '../../../services/users.service';
import * as AuthContextModule from '../../../context/AuthContext';

vi.mock('../../../services/users.service', () => ({
    partialUpdateUser: vi.fn(),
}));

const mockReloadCurrentUser = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('ProfilePage — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderPage = (userContext: any) => {
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            currentUser: userContext,
            reloadCurrentUser: mockReloadCurrentUser,
        } as any);
        return render(
            <MemoryRouter>
                <ProfilePage />
            </MemoryRouter>
        );
    };

    it('no envia si currentUser id no existe', async () => {
        renderPage({ username: 'testuser', email: 'test@mail.com' }); // No ID
        fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
        
        // Modificar para habilitar boton
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Juan' } });
        fireEvent.submit(screen.getByRole('button', { name: /guardar/i }));

        expect(partialUpdateUser).not.toHaveBeenCalled();
    });

    it('valida campos obligatorios username y email vacios', async () => {
        renderPage({ id: 1, username: 'test', email: 'test@test.com' });
        fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
        
        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: '   ' } });
        fireEvent.submit(screen.getByRole('button', { name: /guardar/i }));

        expect(screen.getByText('Usuario y email son obligatorios.')).toBeInTheDocument();
        expect(partialUpdateUser).not.toHaveBeenCalled();
    });

    it('ignora error global al actualizar perfil', async () => {
        (partialUpdateUser as any).mockRejectedValueOnce({ isGlobal: true });
        renderPage({ id: 1, username: 'test', email: 'test@test.com' });
        
        fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Juan' } });
        fireEvent.submit(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => {
            expect(partialUpdateUser).toHaveBeenCalled();
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('maneja error especifico al actualizar perfil', async () => {
        (partialUpdateUser as any).mockRejectedValueOnce({ message: 'El usuario ya existe' });
        renderPage({ id: 1, username: 'test', email: 'test@test.com' });
        
        fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'admin' } });
        fireEvent.submit(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => {
            expect(screen.getByText('El usuario ya existe')).toBeInTheDocument();
        });
    });

    it('renderiza rol nulo, inactivo y valores vacios', () => {
        renderPage({ id: 1, role: null, is_active: false, must_change_password: false });
        expect(screen.getByText('Inactivo')).toBeInTheDocument();
        expect(screen.getAllByText('Usuario').length).toBeGreaterThan(0); // Fallback de rol, username, o first_name
    });

    it('navega a change-password al presionar Cambiar contraseña', () => {
        renderPage({ id: 1 });
        fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/change-password');
    });

    it('boton de cancelar restaura estado inicial', () => {
        renderPage({ id: 1, username: 'test' });
        fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
        
        const userInput = screen.getByPlaceholderText('Usuario');
        fireEvent.change(userInput, { target: { value: 'modificado' } });
        expect(userInput).toHaveValue('modificado');

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        // Al cancelar ya no deberiamos estar en edicion, debe mostrar label
        expect(screen.getAllByText('test').length).toBeGreaterThan(0);
    });
});
