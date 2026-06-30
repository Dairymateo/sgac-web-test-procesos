/// <summary>
/// Componente ChangePasswordPage.test.tsx
/// </summary>
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChangePasswordPage from '../../../pages/ChangePassword/ChangePasswordPage';
import { useAuth } from '../../../context/AuthContext';
import { changePasswordRequest } from '../../../services/auth.service';

vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../../services/auth.service', () => ({
    changePasswordRequest: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
    };
});

describe('ChangePasswordPage', () => {
    const mockLogout = vi.fn();
    const mockReloadCurrentUser = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (useAuth as any).mockReturnValue({
            currentUser: { id: 1, must_change_password: false },
            logout: mockLogout,
            reloadCurrentUser: mockReloadCurrentUser,
        });
    });

    it('renderiza correctamente en modo normal', () => {
        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument();
        expect(screen.getByText('Volver al perfil')).toBeInTheDocument();
    });

    it('renderiza correctamente en modo obligatorio', () => {
        (useAuth as any).mockReturnValue({
            currentUser: { id: 1, must_change_password: true },
            logout: mockLogout,
            reloadCurrentUser: mockReloadCurrentUser,
        });

        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: 'Cambio obligatorio de contraseña' })).toBeInTheDocument();
        expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
    });

    it('muestra y oculta las contraseñas al hacer clic en los botones de ojo', () => {
        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        const currentPasswordInput = screen.getByLabelText('Contraseña actual');
        const eyeButtons = screen.getAllByRole('button', { name: 'Mostrar contraseña' });

        expect(currentPasswordInput).toHaveAttribute('type', 'password');

        fireEvent.click(eyeButtons[0]);
        expect(currentPasswordInput).toHaveAttribute('type', 'text');

        const hideButton = screen.getByRole('button', { name: 'Ocultar contraseña' });
        fireEvent.click(hideButton);
        expect(currentPasswordInput).toHaveAttribute('type', 'password');
    });

    it('muestra error si las contraseñas nuevas no coinciden', () => {
        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'oldPassword123' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newPassword123' } });
        fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'newPassword456' } });

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

        expect(screen.getByRole('alert')).toHaveTextContent('La nueva contraseña y su confirmación no coinciden.');
        expect(changePasswordRequest).not.toHaveBeenCalled();
    });

    it('llama a la API y redirige en caso de éxito', async () => {
        (changePasswordRequest as any).mockResolvedValueOnce({});

        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'oldPassword123' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newPassword123' } });
        fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'newPassword123' } });

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

        expect(changePasswordRequest).toHaveBeenCalledWith({
            current_password: 'oldPassword123',
            new_password: 'newPassword123',
            new_password_confirm: 'newPassword123',
        });

        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Contraseña actualizada correctamente. Redirigiendo...');
        });

        expect(mockReloadCurrentUser).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        }, { timeout: 1500 });
    });

    it('muestra error si la API falla', async () => {
        (changePasswordRequest as any).mockRejectedValueOnce({ message: 'Contraseña actual incorrecta' });

        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'wrongPassword' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newPassword123' } });
        fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'newPassword123' } });

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Contraseña actual incorrecta');
        });
    });

    it('ignora el error si es global', async () => {
        (changePasswordRequest as any).mockRejectedValueOnce({ isGlobal: true });

        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'wrongPassword' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newPassword123' } });
        fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'newPassword123' } });

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    it('llama a logout y redirige al hacer clic en cerrar sesión en modo obligatorio', async () => {
        (useAuth as any).mockReturnValue({
            currentUser: { id: 1, must_change_password: true },
            logout: mockLogout,
            reloadCurrentUser: mockReloadCurrentUser,
        });

        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        });
    });

    it('redirige al perfil al hacer clic en volver al perfil en modo normal', () => {
        render(
            <BrowserRouter>
                <ChangePasswordPage />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Volver al perfil' }));

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/perfil');
    });
});