/// <summary>
/// CotizacionFormModal.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionFormModal from '../../../../pages/Cotizaciones/components/CotizacionFormModal';
import { createCotizacionML, createCotizacionDraft } from '../../../../services/cotizaciones.service';
import { getClientes } from '../../../../services/clientes.service';
import { getVehiculos } from '../../../../services/vehiculos.service';
import { getAseguradoras } from '../../../../services/aseguradoras.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    createCotizacionML: vi.fn(),
    createCotizacionDraft: vi.fn(),
}));
vi.mock('../../../../services/clientes.service', () => ({ getClientes: vi.fn() }));
vi.mock('../../../../services/vehiculos.service', () => ({ getVehiculos: vi.fn() }));
vi.mock('../../../../services/aseguradoras.service', () => ({ getAseguradoras: vi.fn() }));

const MOCK_ASEGURADORAS = [{ id: 1, name: 'Aseguradora Test', is_active: true }];
const MOCK_CLIENTES = [
    { id: 1, customer_code: '00000001', first_names: 'Juan', last_names: 'Perez', document_number: '1105316663', is_active: true },
];
const MOCK_VEHICULOS = [
    { id: 1, owner_customer: 1, license_plate: 'PDA123', brand: 'Toyota', model: 'Corolla', year: 2020, is_active: true },
    { id: 2, owner_customer: 1, license_plate: 'GYE1234', brand: 'Chevrolet', model: 'DMax', year: 2024, is_active: true },
];

const renderModal = () =>
    render(<CotizacionFormModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

describe('CotizacionFormModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getClientes as any).mockResolvedValue(MOCK_CLIENTES);
        (getVehiculos as any).mockResolvedValue(MOCK_VEHICULOS);
        (getAseguradoras as any).mockResolvedValue(MOCK_ASEGURADORAS);
        (createCotizacionDraft as any).mockResolvedValue({});
        (createCotizacionML as any).mockResolvedValue({});
    });

    it('muestra error de validacion si no hay cliente seleccionado al guardar', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });

        expect(screen.getByText('Revise los campos requeridos.')).toBeInTheDocument();
        expect(screen.getAllByText('Este campo es requerido.').length).toBeGreaterThan(0);
    });

    it('muestra error si no hay aseguradora seleccionada', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });

        expect(screen.getByText('Revise los campos requeridos.')).toBeInTheDocument();
    });

    it('muestra error si no hay vehiculo seleccionado', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });

        const fieldError = document.querySelector('.field-error');
        expect(fieldError?.textContent).toMatch(/seleccione un vehículo/i);
    });

    it('puede agregar y quitar filas de vehiculo', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });

        await waitFor(() => expect(screen.getByText('+ Agregar vehículo')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Agregar vehículo'));
        expect(screen.getByText('Vehículo 2')).toBeInTheDocument();

        // Both vehicle selects present — click Quitar on first one
        const quitarBtns = screen.getAllByText('Quitar');
        fireEvent.click(quitarBtns[0]);
        expect(screen.queryByText('Vehículo 2')).not.toBeInTheDocument();
    });

    it('muestra campos de ajuste manual cuando se activa manualOverride', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/valor asegurado/i, { selector: 'select' }), { target: { value: 'true' } });

        expect(screen.getByLabelText(/valor asegurado ajustado/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/motivo del ajuste/i)).toBeInTheDocument();
    });

    it('valida que valor asegurado sea mayor a 0 con override activo', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/valor asegurado/i, { selector: 'select' }), { target: { value: 'true' } });
        fireEvent.change(screen.getByLabelText(/valor asegurado ajustado/i), { target: { value: '-100' } });
        fireEvent.change(screen.getByLabelText(/motivo del ajuste/i), { target: { value: 'Razón de prueba' } });

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });
        expect(screen.getByText('Debe ser mayor a 0.')).toBeInTheDocument();
    });

    it('valida que motivo del ajuste sea obligatorio con override activo', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/valor asegurado/i, { selector: 'select' }), { target: { value: 'true' } });
        fireEvent.change(screen.getByLabelText(/valor asegurado ajustado/i), { target: { value: '25000' } });
        // No motivo ingresado

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });
        expect(screen.getByText('Ingrese el motivo del ajuste manual.')).toBeInTheDocument();
    });

    it('llama Cancelar y cierra el modal', async () => {
        const onClose = vi.fn();
        await act(async () => {
            render(<CotizacionFormModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />);
        });
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
    });

    it('muestra errores de campo de la API con fieldErrors.vehicles', async () => {
        (createCotizacionDraft as any).mockRejectedValue({
            message: 'Invalid data.',
            fieldErrors: {
                vehicles: [{ vehicle: ['This field is required.'] }],
            },
        });

        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });

        await waitFor(() => {
            expect(screen.getByText(/campos marcados en rojo/i)).toBeInTheDocument();
        });
    });

    it('muestra errores de campo top-level de la API', async () => {
        (createCotizacionML as any).mockRejectedValue({
            message: 'Invalid data.',
            fieldErrors: {
                insured_client: ['Quotes are allowed only for individual clients.'],
            },
        });

        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/vehículo \*/i, { selector: 'select' }), { target: { value: '1' } });

        await act(async () => { fireEvent.click(screen.getByText(/crear con scoring ml/i)); });

        await waitFor(() => {
            expect(screen.getByText(/solo se permiten para clientes de persona natural/i)).toBeInTheDocument();
        });
    });

    it('resetea filas de vehiculo al cambiar de cliente', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Agregar vehículo'));
        expect(screen.getByText('Vehículo 2')).toBeInTheDocument();

        // Cambiar de cliente resetea las filas
        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '' } });
        expect(screen.queryByText('Vehículo 2')).not.toBeInTheDocument();
    });

    it('ignora error isGlobal=true al cargar datos', async () => {
        (getClientes as any).mockRejectedValue({ isGlobal: true, message: 'Unauthorized' });

        await act(async () => { renderModal(); });

        // No debe mostrar el mensaje de error global
        expect(screen.queryByText('Unauthorized')).not.toBeInTheDocument();
    });

    it('muestra error generico si falla la carga de datos sin isGlobal', async () => {
        (getClientes as any).mockRejectedValue({ message: 'Error de red' });

        await act(async () => { renderModal(); });

        await waitFor(() => {
            expect(screen.getByText(/error de red/i)).toBeInTheDocument();
        });
    });

    it('muestra el placeholder de no hay vehiculos disponibles cuando cliente no tiene vehiculos', async () => {
        (getVehiculos as any).mockResolvedValue([]);
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });

        await waitFor(() => expect(screen.getByText(/no hay vehículos disponibles/i)).toBeInTheDocument());
    });

    it('crea con dos vehiculos en el payload (multi-vehiculo)', async () => {
        await act(async () => { renderModal(); });
        await waitFor(() => expect(screen.getByText(/Aseguradora Test/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/cliente asegurado \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/aseguradora \*/i), { target: { value: '1' } });
        await waitFor(() => expect(screen.getByText(/PDA123/i)).toBeInTheDocument());

        // Primer vehículo
        const vehicleSelects = screen.getAllByLabelText(/vehículo \*/i, { selector: 'select' });
        fireEvent.change(vehicleSelects[0], { target: { value: '1' } });

        // Agregar segundo vehículo
        fireEvent.click(screen.getByText('+ Agregar vehículo'));
        const vehicleSelects2 = screen.getAllByLabelText(/vehículo \*/i, { selector: 'select' });
        fireEvent.change(vehicleSelects2[1], { target: { value: '2' } });

        await act(async () => { fireEvent.click(screen.getByText(/guardar borrador/i)); });

        await waitFor(() => {
            expect(createCotizacionDraft).toHaveBeenCalledWith(expect.objectContaining({
                vehicles: expect.arrayContaining([
                    expect.objectContaining({ vehicle: 1 }),
                    expect.objectContaining({ vehicle: 2 }),
                ]),
            }));
        });
    });
});
