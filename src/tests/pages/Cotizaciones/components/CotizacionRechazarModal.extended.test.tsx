/// <summary>
/// CotizacionRechazarModal.extended.test.tsx — coverage extension
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionRechazarModal from '../../../../pages/Cotizaciones/components/CotizacionRechazarModal';
import { rejectCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    rejectCotizacion: vi.fn(),
}));

describe('CotizacionRechazarModal — cobertura', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no renderiza nada si isOpen es false', () => {
        const { container } = render(
            <CotizacionRechazarModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('no renderiza nada si cotizacionId es null', () => {
        const { container } = render(
            <CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={null} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('valida que el motivo tenga al menos 5 caracteres', async () => {
        render(<CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />);
        
        fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), { target: { value: 'abc' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        expect(screen.getByText('Debe ingresar un motivo válido (mínimo 5 caracteres).')).toBeInTheDocument();
        expect(screen.getByText('Campo obligatorio.')).toBeInTheDocument();
        expect(rejectCotizacion).not.toHaveBeenCalled();
    });

    it('maneja error global de la api y extrae fields', async () => {
        (rejectCotizacion as any).mockRejectedValueOnce({ message: 'rejection_reason: Motivo duplicado; detail: error' });
        render(<CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />);
        
        fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), { target: { value: 'razon valida' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(screen.getByText('Por favor, revise los campos marcados en rojo.')).toBeInTheDocument();
        });
        expect(screen.getByText('Motivo duplicado')).toBeInTheDocument();
    });

    it('ignora error de isGlobal de axios', async () => {
        (rejectCotizacion as any).mockRejectedValueOnce({ isGlobal: true });
        render(<CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />);
        
        fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), { target: { value: 'razon valida' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        // No debería pintar un error en este componente ya que el interceptor global lo manejará
        await waitFor(() => {
            expect(screen.queryByText(/Por favor, revise/i)).not.toBeInTheDocument();
        });
    });

    it('envia el rechazo correctamente y llama callbacks', async () => {
        (rejectCotizacion as any).mockResolvedValueOnce({});
        render(<CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />);
        
        fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), { target: { value: 'razon valida' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(rejectCotizacion).toHaveBeenCalledWith(1, { rejection_reason: 'razon valida' });
        });
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('maneja error generico si no hay fields parseables', async () => {
        (rejectCotizacion as any).mockRejectedValueOnce({ message: 'Error interno del servidor' });
        render(<CotizacionRechazarModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} cotizacionId={1} />);
        
        fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), { target: { value: 'razon valida' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(screen.getByText('Error interno del servidor')).toBeInTheDocument();
        });
    });
});
