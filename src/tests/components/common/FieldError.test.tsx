/// <summary>
/// Componente FieldError.test.tsx
/// </summary>
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FieldError } from '../../../components/common/FieldError';

describe('FieldError', () => {
    it('renderiza el error cuando existe para el campo', () => {
        render(<FieldError name="email" errors={{ email: 'Email inválido' }} />);
        expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });

    it('no renderiza nada cuando no hay error para el campo', () => {
        const { container } = render(
            <FieldError name="email" errors={{ name: 'Requerido' }} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('no renderiza nada cuando errors está vacío', () => {
        const { container } = render(
            <FieldError name="email" errors={{}} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('renderiza con la clase field-error', () => {
        render(<FieldError name="name" errors={{ name: 'Error' }} />);
        const el = screen.getByText('Error');
        expect(el.className).toBe('field-error');
    });
});