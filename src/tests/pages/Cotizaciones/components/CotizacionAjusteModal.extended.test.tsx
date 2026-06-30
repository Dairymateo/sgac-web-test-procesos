/// <summary>
/// CotizacionAjusteModal.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionAjusteModal from '../../../../pages/Cotizaciones/components/CotizacionAjusteModal';
import { adjustCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    adjustCotizacion: vi.fn(),
}));

const renderModal = (props = {}) =>
    render(
        <CotizacionAjusteModal 
            isOpen={true} 
            onClose={vi.fn()} 
            onSuccess={vi.fn()} 
            cotizacionId={1} 
            currentPremium="100.00" 
            {...props} 
        />
    );

describe('CotizacionAjusteModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no renderiza nada si cotizacionId es null', () => {
        const { container } = render(
            <CotizacionAjusteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={null} currentPremium="100" />
        );
        expect(container.firstChild).toBeNull();
    });

    it('valida que la prima sea mayor o igual a 0.01', async () => {
        renderModal();
        const finalPremiumInput = screen.getByLabelText(/Prima Final/i);
        
        // Zero
        fireEvent.change(finalPremiumInput, { target: { value: '0' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));
        expect(screen.getByText('Debe ingresar un valor numérico válido para la prima.')).toBeInTheDocument();
        
        // Negative
        fireEvent.change(finalPremiumInput, { target: { value: '-10' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));
        expect(screen.getByText('Debe ser un decimal mayor o igual a 0.01.')).toBeInTheDocument();
        
        // Not a number (empty, as letter is usually blocked by number input type but let's test empty)
        fireEvent.change(finalPremiumInput, { target: { value: '' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));
        expect(screen.getByText('Debe ingresar un valor numérico válido para la prima.')).toBeInTheDocument();
    });

    it('muestra errores de campos provenientes de la API (parseApiFieldErrors)', async () => {
        (adjustCotizacion as any).mockRejectedValueOnce({
            message: 'final_premium: The value is too low.; manual_override_reason: Too short.'
        });

        renderModal();
        // Llenar correctamente para pasar la validación local
        fireEvent.change(screen.getByLabelText(/Prima Final/i), { target: { value: '500' } });
        fireEvent.change(screen.getByLabelText(/Justificación/i), { target: { value: 'Razon valida y larga' } });

        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            expect(screen.getByText('Por favor, revise los campos marcados en rojo.')).toBeInTheDocument();
            expect(screen.getByText('The value is too low.')).toBeInTheDocument();
            expect(screen.getByText('Too short.')).toBeInTheDocument();
        });
    });

    it('ignora keys genericas y con espacios en parseApiFieldErrors', async () => {
        (adjustCotizacion as any).mockRejectedValueOnce({
            message: 'detail: Generic error.; my field: Invalid space.;'
        });

        renderModal();
        fireEvent.change(screen.getByLabelText(/Prima Final/i), { target: { value: '500' } });
        fireEvent.change(screen.getByLabelText(/Justificación/i), { target: { value: 'Razon valida y larga' } });

        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            // Because detail and 'my field' are ignored, it falls back to raw message
            expect(screen.getByText('detail: Generic error.; my field: Invalid space.;')).toBeInTheDocument();
        });
    });
});
