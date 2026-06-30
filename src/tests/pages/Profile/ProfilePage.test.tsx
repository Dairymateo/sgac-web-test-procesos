/// <summary>
/// Componente ProfilePage.test.tsx
/// </summary>
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../../../pages/Profile/ProfilePage';
import { partialUpdateUser } from '../../../services/users.service';

const authMocks = vi.hoisted(() => ({
    reloadCurrentUser: vi.fn(),
    currentUser: {
        id: 7,
        username: 'dcorrea',
        first_name: 'Diego',
        last_name: 'Correa',
        email: 'diego@test.com',
        role: 'admin',
        is_active: true,
        must_change_password: false,
    },
}));

vi.mock('../../../services/users.service', () => ({
    partialUpdateUser: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        currentUser: authMocks.currentUser,
        reloadCurrentUser: authMocks.reloadCurrentUser,
    }),
}));

describe('ProfilePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (partialUpdateUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 7 });
    });

    it('permite editar datos basicos del perfil', async () => {
        render(
            <MemoryRouter>
                <ProfilePage />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', { name: /Editar perfil/i }));

        const saveButton = screen.getByRole('button', { name: /Guardar cambios/i });
        expect(saveButton).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Diego Andres' } });
        expect(saveButton).toBeEnabled();

        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(partialUpdateUser).toHaveBeenCalledWith(
                7,
                expect.objectContaining({
                    username: 'dcorrea',
                    first_name: 'Diego Andres',
                    last_name: 'Correa',
                    email: 'diego@test.com',
                }),
            );
            expect(authMocks.reloadCurrentUser).toHaveBeenCalled();
        });
    });
});