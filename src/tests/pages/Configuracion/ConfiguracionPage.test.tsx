import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConfiguracionPage from '../../../pages/Configuracion/ConfiguracionPage';
import { useAuth } from '../../../context/AuthContext';
import { canManageUsers } from '../../../utils/roles';

vi.mock('../../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../../utils/roles', () => ({
    canManageUsers: vi.fn(),
}));

vi.mock('../../../pages/Users/UsersPage', () => ({
    default: () => <div data-testid="users-page">UsersPage</div>,
}));

describe('ConfiguracionPage', () => {
    it('redirects to dashboard if user cannot manage users', () => {
        (useAuth as any).mockReturnValue({ currentUser: { id: 1, role: 'broker' } });
        (canManageUsers as any).mockReturnValue(false);

        render(
            <MemoryRouter initialEntries={['/config']}>
                <ConfiguracionPage />
            </MemoryRouter>
        );

        expect(screen.queryByTestId('users-page')).not.toBeInTheDocument();
    });

    it('renders config page and users page if user can manage users', () => {
        (useAuth as any).mockReturnValue({ currentUser: { id: 1, role: 'admin' } });
        (canManageUsers as any).mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/config']}>
                <ConfiguracionPage />
            </MemoryRouter>
        );

        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByTestId('users-page')).toBeInTheDocument();
    });
});