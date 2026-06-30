import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateWheelPicker from '../../../components/common/DateWheelPicker';

describe('DateWheelPicker', () => {
    it('renderiza correctamente el placeholder', () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} placeholder="Fecha test" />);
        expect(screen.getByText('Fecha test')).toBeInTheDocument();
    });

    it('abre el modal al hacer clic', async () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(screen.getByText('Día')).toBeInTheDocument();
    });

    it('llama onChange al confirmar', () => {
        const onChangeMock = vi.fn();
        render(<DateWheelPicker value="2024-05-15" onChange={onChangeMock} />);
        
        fireEvent.click(screen.getByRole('button'));
        const aceptarBtn = screen.getByText('Aceptar');
        fireEvent.click(aceptarBtn);

        expect(onChangeMock).toHaveBeenCalledWith('2024-05-15');
    });

    it('cierra el modal al hacer clic en cancelar', () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        
        const cancelarBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelarBtn);
        expect(screen.queryByText('Día')).not.toBeInTheDocument();
    });

    it('cierra el modal al hacer clic en el overlay', () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        
        const overlay = document.querySelector('.dwp-overlay');
        expect(overlay).toBeInTheDocument();
        fireEvent.click(overlay!);
        expect(screen.queryByText('Día')).not.toBeInTheDocument();
    });

    it('limpia el valor cuando es clearable', () => {
        const onChangeMock = vi.fn();
        render(<DateWheelPicker value="2024-05-15" onChange={onChangeMock} clearable />);
        
        const clearBtn = screen.getByLabelText('Limpiar fecha');
        fireEvent.click(clearBtn);
        expect(onChangeMock).toHaveBeenCalledWith(null);
    });



    it('no abre el modal si esta disabled', () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} disabled />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(screen.queryByText('Día')).not.toBeInTheDocument();
    });

    it('cambia el input hidden si tiene ID', () => {
        const onChangeMock = vi.fn();
        render(<DateWheelPicker value="2023-01-01" onChange={onChangeMock} id="test-id" />);
        const input = document.getElementById('test-id') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        
        fireEvent.change(input, { target: { value: '2023-02-02' } });
        expect(onChangeMock).toHaveBeenCalledWith('2023-02-02');
    });

    it('inicializa correctamente al abrir si no hay valor (con fecha de hoy)', () => {
        render(<DateWheelPicker value={null} onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Día')).toBeInTheDocument();
        // Solo verificamos que abre y renderiza las columnas
    });
});