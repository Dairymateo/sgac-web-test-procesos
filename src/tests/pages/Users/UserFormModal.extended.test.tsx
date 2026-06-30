/// <summary>
/// UserFormModal.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserFormModal from '../../../pages/Users/components/UserFormModal';

const MOCK_ON_SAVE = vi.fn();
const MOCK_ON_CLOSE = vi.fn();

const renderModal = (props = {}) =>
    render(<UserFormModal isOpen={true} onClose={MOCK_ON_CLOSE} onSave={MOCK_ON_SAVE} {...props} />);

describe('UserFormModal — cobertura extendida', () => {
    it('valida que los apellidos sean obligatorios', async () => {
        renderModal();
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        const lastNameInput = screen.getByLabelText(/apellidos \*/i);

        fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user_test' } });
        fireEvent.change(screen.getByLabelText(/nombre\(s\) \*/i), { target: { value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: 'juan@test.com' } });
        fireEvent.change(screen.getByLabelText(/contraseña temporal \*/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/^rol$/i), { target: { value: 'admin' } });

        // Dejar vacio
        fireEvent.change(lastNameInput, { target: { value: '   ' } });
        fireEvent.click(saveButton);
        expect(await screen.findByText('Ingrese los apellidos.')).toBeInTheDocument();
    });

    it('valida que los apellidos tengan formato correcto', async () => {
        // Since input onChange filters out numbers, the only way to trigger the format error
        // is if the data comes from an external source (like editingUser) and we try to save it.
        renderModal({
            editingUser: {
                id: 1,
                username: 'admin',
                first_name: 'Juan',
                last_name: 'Perez 123', // Invalid chars
                email: 'juan@test.com',
                role: 'admin',
                is_active: true
            }
        });
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        // Make the form dirty so the save button is enabled
        fireEvent.change(screen.getByLabelText(/nombre\(s\) \*/i), { target: { value: 'Juan Carlos' } });
        fireEvent.click(saveButton);
        expect(await screen.findByText('Use solo letras y espacios.')).toBeInTheDocument();
    });

    it('valida rol obligatorio o invalido', async () => {
        renderModal();
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        const roleSelect = screen.getByLabelText(/^rol$/i);

        fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user_test' } });
        fireEvent.change(screen.getByLabelText(/nombre\(s\) \*/i), { target: { value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/apellidos \*/i), { target: { value: 'Perez' } });
        fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: 'juan@test.com' } });
        fireEvent.change(screen.getByLabelText(/contraseña temporal \*/i), { target: { value: 'password123' } });
        
        fireEvent.change(roleSelect, { target: { value: 'rol_falso' } });
        fireEvent.click(saveButton);
        expect(await screen.findByText('Seleccione un rol válido.')).toBeInTheDocument();
    });

    it('muestra error general si la api falla sin fieldErrors y no es global', async () => {
        MOCK_ON_SAVE.mockRejectedValueOnce({ message: 'Database timeout' });

        renderModal();

        fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user_test' } });
        fireEvent.change(screen.getByLabelText(/nombre\(s\) \*/i), { target: { value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/apellidos \*/i), { target: { value: 'Perez' } });
        fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: 'juan@test.com' } });
        fireEvent.change(screen.getByLabelText(/contraseña temporal \*/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/^rol$/i), { target: { value: 'admin' } });

        // Actually, we can bypass validation if we fill it correctly
        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => {
            expect(screen.getByText('Database timeout')).toBeInTheDocument();
        });
    });

    it('parsea mensajes de error con formato especial desde el backend', async () => {
        MOCK_ON_SAVE.mockRejectedValueOnce({ 
            message: 'email: email already exists; first_name: This field is required;' 
        });

        renderModal();

        fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user_test' } });
        fireEvent.change(screen.getByLabelText(/nombre\(s\) \*/i), { target: { value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/apellidos \*/i), { target: { value: 'Perez' } });
        fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: 'juan@test.com' } });
        fireEvent.change(screen.getByLabelText(/contraseña temporal \*/i), { target: { value: 'password123' } });
        
        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => {
            expect(screen.getByText('Revisa los campos marcados antes de guardar.')).toBeInTheDocument();
            expect(screen.getByText('Ya existe un usuario con ese correo electrónico.')).toBeInTheDocument();
            expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument();
        });
    });
});
