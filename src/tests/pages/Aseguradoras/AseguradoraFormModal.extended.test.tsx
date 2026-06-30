/// <summary>
/// AseguradoraFormModal.extended.test.tsx — coverage extension
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AseguradoraFormModal from '../../../pages/Aseguradoras/components/AseguradoraFormModal';
import { createAseguradora } from '../../../services/aseguradoras.service';
import { getTalleres } from '../../../services/talleres.service';
import { fetchCountries, fetchStates, fetchCities } from '../../../services/geo.service';

vi.mock('../../../services/aseguradoras.service', () => ({
    createAseguradora: vi.fn(),
    updateAseguradora: vi.fn(),
}));

vi.mock('../../../services/talleres.service', () => ({
    getTalleres: vi.fn(),
}));

vi.mock('../../../services/geo.service', () => ({
    fetchCountries: vi.fn(),
    fetchStates: vi.fn(),
    fetchCities: vi.fn(),
}));

const mockOnClose = vi.fn();
const mockOnSaveSuccess = vi.fn();

describe('AseguradoraFormModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fetchCountries as any).mockResolvedValue([{ name: 'Ecuador', iso2: 'EC' }]);
        (fetchStates as any).mockResolvedValue([{ name: 'Pichincha', state_code: 'PI' }]);
        (fetchCities as any).mockResolvedValue([{ name: 'Quito' }]);
        (getTalleres as any).mockResolvedValue([{ id: 1, name: 'Taller Prueba', is_active: true }]);
    });

    it('no renderiza si isOpen es false', () => {
        const { container } = render(
            <AseguradoraFormModal isOpen={false} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('cambia valores geograficos y solicita datos encadenados', async () => {
        render(<AseguradoraFormModal isOpen={true} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />);
        
        await waitFor(() => {
            expect(fetchCountries).toHaveBeenCalled();
        });

        // Simula la seleccion de pais
        await waitFor(() => expect(screen.getByRole('option', { name: 'Ecuador' })).toBeInTheDocument());
        const countrySelect = screen.getByLabelText(/pais/i);
        fireEvent.change(countrySelect, { target: { value: 'Ecuador' } });
        
        await waitFor(() => {
            expect(fetchStates).toHaveBeenCalledWith('Ecuador');
        });

        // Simula la seleccion de provincia
        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        const stateSelect = screen.getByLabelText(/provincia/i);
        fireEvent.change(stateSelect, { target: { value: 'Pichincha' } });
        
        await waitFor(() => {
            expect(fetchCities).toHaveBeenCalledWith('Ecuador', 'Pichincha');
        });

        // Limpiar provincia y pais resetea cascada
        fireEvent.change(countrySelect, { target: { value: '' } });
        fireEvent.change(stateSelect, { target: { value: '' } });
    });

    it('permite añadir y quitar talleres vinculados', async () => {
        render(<AseguradoraFormModal isOpen={true} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />);
        
        // Cambiar a la tab de Talleres (índice 2)
        fireEvent.click(screen.getByText('Talleres Asociados'));
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Talleres Vinculados/i })).toBeInTheDocument();
        });

        const selectTaller = screen.getByRole('combobox'); // El unico en esa tab sin label especifico
        await screen.findByRole('option', { name: /Taller Prueba/i });
        fireEvent.change(selectTaller, { target: { value: '1' } });
        
        const btnAdd = screen.getByText('+ Agregar');
        fireEvent.click(btnAdd);

        expect(screen.getByText('Taller Prueba')).toBeInTheDocument();

        // Quitar el taller
        const btnRemove = screen.getByLabelText('Quitar Taller Prueba');
        fireEvent.click(btnRemove);

        expect(screen.queryByText('Taller Prueba')).not.toBeInTheDocument();
        expect(screen.getByText('No hay talleres vinculados.')).toBeInTheDocument();
    });

    it('ignora error global de API', async () => {
        (createAseguradora as any).mockRejectedValueOnce({ isGlobal: true });
        
        render(<AseguradoraFormModal isOpen={true} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />);
        
        // Llenamos para pasar la validacion local basica (requiere varios campos)
        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Test Aseguradora' } });
        fireEvent.change(screen.getByLabelText(/numero de documento/i), { target: { value: '1791288967001' } });
        await waitFor(() => expect(screen.getByLabelText(/pais/i).querySelector('option[value="Ecuador"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/pais/i), { target: { value: 'Ecuador' } });
        await waitFor(() => expect(screen.getByLabelText(/provincia/i).querySelector('option[value="Pichincha"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByLabelText(/ciudad/i).querySelector('option[value="Quito"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { value: 'Quito' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { value: 'Una direccion' } });
        fireEvent.change(screen.getByLabelText(/telefono \*/i), { target: { value: '0991234567' } });

        fireEvent.click(screen.getByText('Ejecutivos'));
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[0], { target: { value: 'Exec 1' } }); // account
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[0], { target: { value: '0991234567' } }); // account
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[0], { target: { value: 'exec1@mail.com' } }); // account
        
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[1], { target: { value: 'Exec 2' } }); // claims
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[1], { target: { value: '0991234567' } }); // claims
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[1], { target: { value: 'exec2@mail.com' } }); // claims
        
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[2], { target: { value: 'Exec 3' } }); // portfolio
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[2], { target: { value: '0991234567' } }); // portfolio
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[2], { target: { value: 'exec3@mail.com' } }); // portfolio

        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
        
        // No debe mostrar un error local
        await waitFor(() => {
            expect(screen.queryByText(/Por favor, revise/i)).not.toBeInTheDocument();
        });
    });

    it('formatea errores desde fieldErrors del servidor', async () => {
        (createAseguradora as any).mockRejectedValueOnce({
            fieldErrors: {
                name: 'already exists',
                document_number: 'valid ecuadorian ruc'
            }
        });
        
        render(<AseguradoraFormModal isOpen={true} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />);
        
        // Llenamos con algo para que intente
        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Aseg 1' } });
        fireEvent.change(screen.getByLabelText(/numero de documento/i), { target: { value: '1791288967001' } });
        await waitFor(() => expect(screen.getByLabelText(/pais/i).querySelector('option[value="Ecuador"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/pais/i), { target: { value: 'Ecuador' } });
        await waitFor(() => expect(screen.getByLabelText(/provincia/i).querySelector('option[value="Pichincha"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByLabelText(/ciudad/i).querySelector('option[value="Quito"]')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { value: 'Quito' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { value: 'Una direccion' } });
        fireEvent.change(screen.getByLabelText(/telefono \*/i), { target: { value: '0991234567' } });

        fireEvent.click(screen.getByText('Ejecutivos'));
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[0], { target: { value: 'Exec 1' } });
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[0], { target: { value: '0991234567' } });
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[0], { target: { value: 'exec1@mail.com' } });
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[1], { target: { value: 'Exec 2' } });
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[1], { target: { value: '0991234567' } });
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[1], { target: { value: 'exec2@mail.com' } });
        fireEvent.change(screen.getAllByLabelText(/nombre \*/i)[2], { target: { value: 'Exec 3' } });
        fireEvent.change(screen.getAllByLabelText(/telefono \*/i)[2], { target: { value: '0991234567' } });
        fireEvent.change(screen.getAllByLabelText(/email \*/i)[2], { target: { value: 'exec3@mail.com' } });

        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
        
        await waitFor(() => {
            expect(screen.getByText('Por favor, revise los campos marcados en rojo.')).toBeInTheDocument();
        });
        // Debería cambiar la tab al 0 (Informacion General) por `name` y `document_number`
        expect(screen.getByText('Ya existe una aseguradora con este nombre.')).toBeInTheDocument();
        expect(screen.getByText('Debe ser un RUC ecuatoriano válido.')).toBeInTheDocument();
    });

    it('restringe la entrada de caracteres no numericos en documento y telefono', async () => {
        render(<AseguradoraFormModal isOpen={true} onClose={mockOnClose} onSaveSuccess={mockOnSaveSuccess} canMutate={true} />);
        
        const docInput = screen.getByLabelText(/numero de documento/i);
        fireEvent.change(docInput, { target: { value: 'abc12' } });
        expect(docInput).toHaveValue(''); // Ignora porque 'abc12' no es numérico puro

        fireEvent.change(docInput, { target: { value: '179' } });
        expect(docInput).toHaveValue('179');
    });
});
