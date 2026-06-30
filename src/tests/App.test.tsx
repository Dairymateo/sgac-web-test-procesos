/// <summary>
/// Componente App.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Header from '../components/layout/Header/Header';
import UserFormModal from '../pages/Users/components/UserFormModal';
import { AuthProvider } from '../context/AuthContext';

function withAuth(ui: React.ReactElement, token?: string) {
    if (token) localStorage.setItem('token', token);
    const result = render(
        <AuthProvider>
            <MemoryRouter>{ui}</MemoryRouter>
        </AuthProvider>
    );
    return result;
}

describe('LoginPage', () => {
    beforeEach(() => localStorage.clear());

    it('renderiza el título de inicio de sesión', () => {
        withAuth(<LoginPage />);
        expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });

    it('renderiza el campo de usuario', () => {
        withAuth(<LoginPage />);
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renderiza el campo de contraseña', () => {
        withAuth(<LoginPage />);
        expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    it('renderiza el botón de inicio de sesión', () => {
        withAuth(<LoginPage />);
        expect(
            screen.getByRole('button', { name: /Iniciar sesión/i })
        ).toBeInTheDocument();
    });

    it('no muestra error al cargar', () => {
        withAuth(<LoginPage />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('muestra error cuando el backend rechaza las credenciales', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as typeof fetch;

        withAuth(<LoginPage />);
        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'test@sgac.com' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'wrongpass' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() =>
            expect(screen.getByRole('alert')).toBeInTheDocument()
        );
    });

    it('deshabilita el botón mientras carga', async () => {
        globalThis.fetch = vi.fn().mockImplementation(
            () => new Promise(() => { })
        ) as typeof fetch;

        withAuth(<LoginPage />);
        fireEvent.change(screen.getByLabelText('Email'), {
            target: { value: 'test@sgac.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /Verificando/i })
            ).toBeDisabled()
        );
    });

    it('alterna la visibilidad de la contraseña', () => {
        withAuth(<LoginPage />);
        const passwordInput = screen.getByLabelText('Contraseña') as HTMLInputElement;
        const toggleButton = screen.getByLabelText(/Mostrar contraseña/i);

        expect(passwordInput.type).toBe('password');
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');
        fireEvent.click(screen.getByLabelText(/Ocultar contraseña/i));
        expect(passwordInput.type).toBe('password');
    });

    it('navega al dashboard tras un inicio de sesión exitoso', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ access: 'fake-token', refresh: 'fake-refresh' }),
        }) as typeof fetch;

        withAuth(<LoginPage />);

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBe('fake-token');
        });
    });
});

describe('ProtectedRoute', () => {
    beforeEach(() => localStorage.clear());

    it('redirige al login si no hay token', async () => {
        render(
            <AuthProvider>
                <MemoryRouter initialEntries={['/dashboard']}>
                    <ProtectedRoute />
                </MemoryRouter>
            </AuthProvider>
        );
        await waitFor(() => expect(screen.queryByText('dashboard')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
    });

    it('permite el acceso si hay token en localStorage', async () => {
        const payload = btoa(JSON.stringify({ username: 'test' }));
        localStorage.setItem('token', `header.${payload}.signature`);
        render(
            <AuthProvider>
                <MemoryRouter>
                    <ProtectedRoute />
                </MemoryRouter>
            </AuthProvider>
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
    });
});
describe('Header', () => {
    beforeEach(() => localStorage.clear());

    it('muestra "User" como fallback si no hay sesión activa', async () => {
        withAuth(<Header />);
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('Usuario')).toBeInTheDocument();
    });

    it('muestra el nombre del usuario logueado desde el JWT', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;

        const payload = btoa(JSON.stringify({ username: 'ana.lopez' }));
        const fakeJwt = `header.${payload}.signature`;
        localStorage.setItem('token', fakeJwt);
        withAuth(<Header />);
        await waitFor(() => expect(screen.getByText('ana.lopez')).toBeInTheDocument());
    });

    it('no muestra la campana de notificaciones con badge si no hay alertas', async () => {
        withAuth(<Header alerts={[]} />);
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });

    it('muestra el badge de notificaciones si hay alertas', async () => {
        const alerts = [
            { type: 'policy_expiring', title: 'Póliza próxima a vencer', message: 'Vence pronto', resource: 'policy' as const, resource_id: 1, due_date: null, severity: 'warning' as const },
            { type: 'claim_open_too_long', title: 'Siniestro', message: 'Abierto mucho tiempo', resource: 'claim' as const, resource_id: 2, due_date: null, severity: 'critical' as const },
        ];
        withAuth(<Header alerts={alerts} />);
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('muestra opciones de cuenta al abrir el menu de usuario', async () => {
        withAuth(<Header />);
        fireEvent.click(await screen.findByRole('button', { name: /Abrir menú de usuario/i }));

        expect(screen.getByRole('menuitem', { name: /Mi perfil/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Cambiar contraseña/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Cerrar sesión/i })).toBeInTheDocument();
    });

    it('llama a logout desde el menu de usuario', async () => {
        const payload = btoa(JSON.stringify({ username: 'test' }));
        localStorage.setItem('token', `header.${payload}.signature`);
        withAuth(<Header />);
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        }) as typeof fetch;

        fireEvent.click(await screen.findByRole('button', { name: /Abrir menú de usuario/i }));
        const logoutButton = await screen.findByRole('menuitem', { name: /Cerrar sesión/i });
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBeNull();
        });
    });
});

describe('UserFormModal', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no renderiza nada cuando isOpen es false', () => {
        render(
            <UserFormModal isOpen={false} onClose={onClose} onSave={onSave} />
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renderiza el modal con título "Nuevo usuario" cuando no hay editingUser', () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Nuevo usuario')).toBeInTheDocument();
    });

    it('renderiza el modal con título "Editar usuario" cuando hay editingUser', () => {
        const user = { id: 1, username: 'alopez', first_name: 'Ana', last_name: 'López', email: 'ana@sgac.com', role: 'quote_technician' as const, is_active: true, date_joined: '2023-01-01', created_at: '2023-01-01', updated_at: '2023-01-01' };
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} editingUser={user} />
        );
        expect(screen.getByText('Editar usuario')).toBeInTheDocument();
    });

    it('pre-rellena los campos con los datos del usuario al editar', () => {
        const user = { id: 1, username: 'alopez', first_name: 'Ana', last_name: 'López', email: 'ana@sgac.com', role: 'quote_technician' as const, is_active: true, date_joined: '2023-01-01', created_at: '2023-01-01', updated_at: '2023-01-01' };
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} editingUser={user} />
        );
        expect(screen.getByDisplayValue('alopez')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ana@sgac.com')).toBeInTheDocument();
    });

    it('llama a onSave al enviar el formulario', async () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
            target: { value: 'pruiz' },
        });
        fireEvent.change(screen.getByLabelText(/Nombre\(s\)/i), {
            target: { value: 'Pedro' },
        });
        fireEvent.change(screen.getByLabelText(/Apellidos/i), {
            target: { value: 'Ruiz' },
        });
        fireEvent.change(screen.getByLabelText(/^Email/i), {
            target: { value: 'pedro@sgac.com' },
        });
        fireEvent.change(screen.getByLabelText(/Contraseña temporal/i), {
            target: { value: 'temporal123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            username: 'pruiz',
            first_name: 'PEDRO',
            last_name: 'RUIZ',
            email: 'pedro@sgac.com'
        })));
    });

    it('llama a onClose al hacer clic en Cancelar', () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('cambia el estado de activo/inactivo', () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        const select = screen.getByLabelText('Estado') as HTMLSelectElement;
        expect(select.value).toBe('Activo');
        fireEvent.change(select, { target: { value: 'Inactivo' } });
        expect(select.value).toBe('Inactivo');
    });

    it('cambia el rol del usuario', () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        const select = screen.getByLabelText('Rol') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'admin' } });
        expect(select.value).toBe('admin');
        fireEvent.change(select, { target: { value: 'admin' } });
        expect(select.value).toBe('admin');
    });

    it('alterna la visibilidad de la contraseña en el modal', () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );
        const passwordInput = screen.getByLabelText(/Contraseña temporal/i) as HTMLInputElement;
        const toggleButton = screen.getByLabelText(/Mostrar contraseña/i);

        expect(passwordInput.type).toBe('password');
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');
    });

    it('valida email localmente y no envia el formulario si el formato es invalido', async () => {
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );

        fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
            target: { value: 'mherrera' },
        });
        fireEvent.change(screen.getByLabelText(/Nombre\(s\)/i), {
            target: { value: 'Mario' },
        });
        fireEvent.change(screen.getByLabelText(/Apellidos/i), {
            target: { value: 'Herrera' },
        });
        fireEvent.change(screen.getByLabelText(/^Email/i), {
            target: { value: 'mherrera@com' },
        });
        fireEvent.change(screen.getByLabelText(/Contraseña temporal/i), {
            target: { value: 'temporal123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

        expect(await screen.findByText('Ingrese un correo electrónico válido.')).toBeInTheDocument();
        expect(screen.getByText('Revisa los campos marcados antes de guardar.')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('mapea fieldErrors del backend debajo del input correspondiente', async () => {
        onSave.mockRejectedValueOnce({
            message: 'Invalid data.',
            fieldErrors: {
                email: 'Enter a valid email address.',
            },
        });
        render(
            <UserFormModal isOpen={true} onClose={onClose} onSave={onSave} />
        );

        fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
            target: { value: 'mherrera' },
        });
        fireEvent.change(screen.getByLabelText(/Nombre\(s\)/i), {
            target: { value: 'Mario' },
        });
        fireEvent.change(screen.getByLabelText(/Apellidos/i), {
            target: { value: 'Herrera' },
        });
        fireEvent.change(screen.getByLabelText(/^Email/i), {
            target: { value: 'mherrera@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/Contraseña temporal/i), {
            target: { value: 'temporal123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

        expect(await screen.findByText('Ingrese un correo electrónico válido.')).toBeInTheDocument();
        expect(screen.queryByText('Invalid data.')).not.toBeInTheDocument();
    });
});