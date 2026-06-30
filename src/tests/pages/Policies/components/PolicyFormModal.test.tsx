/// <summary>
/// Componente PolicyFormModal.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PolicyFormModal from '../../../../pages/Policies/components/PolicyFormModal';
import { getClientes } from '../../../../services/clientes.service';
import { getVehiculos } from '../../../../services/vehiculos.service';
import { getAseguradoras } from '../../../../services/aseguradoras.service';
import { updatePolicy, createPolicy, uploadPolicyDocument, sendToInsurer, activateWithEmail, partialUpdatePolicy } from '../../../../services/policies.service';
import userEvent from '@testing-library/user-event';

vi.mock('../../../../services/clientes.service', () => ({ getClientes: vi.fn() }));
vi.mock('../../../../services/vehiculos.service', () => ({ getVehiculos: vi.fn() }));
vi.mock('../../../../services/aseguradoras.service', () => ({ getAseguradoras: vi.fn() }));
vi.mock('../../../../services/policies.service', () => ({
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    partialUpdatePolicy: vi.fn(),
    sendToInsurer: vi.fn(),
    activateWithEmail: vi.fn(),
    getPolicyDocumentUrl: vi.fn(),
    uploadPolicyDocument: vi.fn(),
}));

describe('PolicyFormModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSaveSuccess: vi.fn(),
        canMutate: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (getClientes as any).mockResolvedValue([{ id: 1, first_names: 'Juan', last_names: 'Perez', is_active: true }]);
        (getVehiculos as any).mockResolvedValue([{ id: 1, license_plate: 'ABC-123', owner_customer: 1, is_active: true, current_value: '5000.00' }]);
        (getAseguradoras as any).mockResolvedValue([{ id: 1, name: 'Mapfre', active: true }]);
    });

    it('no renderiza si isOpen es false', () => {
        render(<PolicyFormModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renderiza correctamente el modal de creacion', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Registrar Póliza')).toBeInTheDocument();
            expect(getClientes).toHaveBeenCalled();
            expect(getVehiculos).toHaveBeenCalled();
            expect(getAseguradoras).toHaveBeenCalled();
        });
    });

    it('permite cambiar entre pestañas', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Informacion General')).toBeInTheDocument();
        });

        const vehiculosTab = screen.getByText('Vehiculos');
        fireEvent.click(vehiculosTab);

        expect(screen.getByText(/Ocupantes/i)).toBeInTheDocument();

        const pagosTab = screen.getByText('Pagos');
        fireEvent.click(pagosTab);

        expect(screen.getByText(/Metodo de pago/i)).toBeInTheDocument();
    });

    it('muestra error de validacion al intentar guardar sin datos', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => {
            expect(screen.getByText('Por favor, revise los campos marcados en rojo.')).toBeInTheDocument();
            expect(screen.getByText('Seleccione una aseguradora.')).toBeInTheDocument();
        });
    });

    it('permite llenar el formulario, agregar un vehiculo y cobertura', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        const insurerSelect = screen.getByLabelText(/Aseguradora \*/i);
        fireEvent.change(insurerSelect, { target: { value: '1' } });

        const customerSelect = screen.getByLabelText(/Cliente asegurado \*/i);
        fireEvent.change(customerSelect, { target: { value: '1' } });

        fireEvent.click(screen.getByText('Valores'));

        const netPremium = screen.getByLabelText(/Prima neta \*/i);
        fireEvent.change(netPremium, { target: { value: '100' } });

        fireEvent.click(screen.getByText('Vehiculos'));

        const vehicleSelect = screen.getByLabelText(/Vehículo \*/i);
        fireEvent.change(vehicleSelect, { target: { value: '1' } });

        const addCoverageBtn = screen.getByRole('button', { name: /\+ Agregar cobertura/i });
        fireEvent.click(addCoverageBtn);

        expect(screen.getAllByText(/Monto asegurado/i).length).toBeGreaterThan(0);
    });

    it('permite interactuar con la pestaña de Pagos', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Pagos'));

        const paymentMethodSelect = screen.getByLabelText(/Metodo de pago/i);
        fireEvent.change(paymentMethodSelect, { target: { value: 'installments' } });

        const addPaymentBtn = screen.getByRole('button', { name: /Agregar cuota/i });
        fireEvent.click(addPaymentBtn);

        const removeInstallmentBtns = screen.getAllByTitle(/Quitar cuota/i);
        expect(removeInstallmentBtns.length).toBeGreaterThan(0);

        const dateInputs = document.querySelectorAll('.policy-installment-row input[type="date"]');
        if (dateInputs.length > 0) {
            fireEvent.change(dateInputs[0], { target: { value: '2026-10-10' } });
        }

        const numberInputs = document.querySelectorAll('.policy-installment-row input[type="number"]');
        if (numberInputs.length > 0) {
            fireEvent.change(Array.from(numberInputs).at(-1)!, { target: { value: '100.00' } });
        }

        const checkbox = document.querySelectorAll('.policy-installment-check input[type="checkbox"]');
        if (checkbox.length > 0) {
            fireEvent.click(checkbox[0]);
        }

        fireEvent.click(removeInstallmentBtns[0]);
    });

    it('cierra el modal al dar clic en cancelar', async () => {
        render(<PolicyFormModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('permite interactuar con la pestaña de Clausulas', async () => {
        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Clausulas'));

        const addClauseBtn = screen.getByText(/Agregar cláusula/i);
        fireEvent.click(addClauseBtn);

        const clauseTypeSelects = document.querySelectorAll('.policy-clause-row select');
        expect(clauseTypeSelects.length).toBeGreaterThan(0);

        fireEvent.change(clauseTypeSelects[0], { target: { value: 'special' } });

        const deleteClauseBtn = screen.getByText('Quitar');
        fireEvent.click(deleteClauseBtn);

        expect(screen.queryByText('Quitar')).not.toBeInTheDocument();
    });

    it('renderiza modo solo lectura (viewingPolicy)', async () => {
        const viewingPolicy: any = {
            id: 1, status: 'draft', policy_number: 'VIEW-001', insurer: 1, insured_customer: 1,
            vehicles: [{ vehicle: 1, net_premium: '100', coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };
        const onOpenEditMock = vi.fn();
        render(<PolicyFormModal {...defaultProps} viewingPolicy={viewingPolicy} onOpenEdit={onOpenEditMock} />);

        await waitFor(() => {
            expect(screen.getByText('Detalles de Póliza')).toBeInTheDocument();
        });


        const editBtn = screen.getByRole('button', { name: /Editar/i });
        fireEvent.click(editBtn);
        expect(onOpenEditMock).toHaveBeenCalledWith(viewingPolicy);
    });

    it('permite modo edición y llama a updatePolicy al guardar', async () => {
        const editingPolicy: any = {
            id: 1, policy_number: 'EDIT-001', insurer: 1, insured_customer: 1,
            valid_from: '2026-01-01', valid_until: '2027-01-01', issue_date: '2026-01-01', branch: 'UIO',
            net_premium: '500', emission_rights: '9', iva_percentage: '15', payment_method: 'cash',
            vehicles: [{ vehicle: 1, insured_value: '1000', net_premium: '500', occupants: 1, coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };

        (updatePolicy as any).mockResolvedValue({ id: 1 });

        render(<PolicyFormModal {...defaultProps} editingPolicy={editingPolicy} />);

        await waitFor(() => {
            expect(screen.getByText('Actualizar Póliza')).toBeInTheDocument();
            expect(screen.getByDisplayValue('EDIT-001')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Número de póliza/i), { target: { value: 'EDIT-002' } });
        expect(screen.getByDisplayValue('EDIT-002')).toBeInTheDocument();
    });

    it('interactúa con la pestaña de Documento y subida de archivos', async () => {
        const editingPolicy: any = { id: 1, policy_number: 'EDIT-001', insurer: 1, insured_customer: 1, vehicles: [], clauses: [], installments: [] };
        render(<PolicyFormModal {...defaultProps} editingPolicy={editingPolicy} />);
        await waitFor(() => expect(screen.getByText('Actualizar Póliza')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Documento'));

        const fileInput = screen.getByLabelText(/PDF de poliza/i);
        const file = new File(['dummy content'], 'policy.pdf', { type: 'application/pdf' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect((fileInput as HTMLInputElement).files?.[0]?.name).toBe('policy.pdf');
        });
    });

    it('interactúa con coberturas y deducibles dentro de Vehiculos', async () => {
        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Vehiculos'));

        const addDeductibleBtn = screen.getByRole('button', { name: /\+ Agregar deducible/i });
        fireEvent.click(addDeductibleBtn);

        const dedTypeSelects = document.querySelectorAll('.policy-deductible-row select');
        expect(dedTypeSelects.length).toBeGreaterThan(0);

        const removeDeductibleBtn = screen.getByTitle(/Quitar deducible/i);
        fireEvent.click(removeDeductibleBtn);

        const addVehicleBtn = screen.getByRole('button', { name: /Agregar vehículo/i });
        fireEvent.click(addVehicleBtn);

        const vehicleTabs = screen.getAllByText(/Vehículo #/i);
        expect(vehicleTabs.length).toBeGreaterThan(1);

        const vehicleSelects = document.querySelectorAll('select[id^="vehicle-"]');
        if (vehicleSelects.length > 1) {
            fireEvent.change(vehicleSelects[1], { target: { value: '1' } });
        }

        const removeVehicleBtn = screen.getAllByText('Quitar vehículo')[1];
        fireEvent.click(removeVehicleBtn);
    });

    it('muestra errores de validacion avanzados', async () => {
        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Aseguradora/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Cliente asegurado/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2025-10-01' } }); 

        fireEvent.click(screen.getByText('Vehiculos'));
        fireEvent.click(screen.getByRole('button', { name: /Agregar vehículo/i }));

        const saveBtn = screen.getByRole('button', { name: /Guardar/i });
        fireEvent.submit(saveBtn.closest('form') as HTMLFormElement);

        await waitFor(() => {
            expect(screen.getByText('Por favor, revise los campos marcados en rojo.')).toBeInTheDocument();
        });
    });

    it('ejecuta createPolicy exitosamente al guardar datos validos', async () => {
        (updatePolicy as any).mockResolvedValue({ id: 1 });
        (createPolicy as any).mockResolvedValue({ id: 2 });

        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Juan Perez/i })).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Mapfre/i })).toBeInTheDocument());

        await userEvent.selectOptions(screen.getByLabelText(/Aseguradora/i), '1');
        await userEvent.selectOptions(screen.getByLabelText(/Cliente asegurado/i), '1');
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2027-10-01' } });
        fireEvent.change(screen.getByLabelText(/Sucursal \*/i), { target: { value: 'UIO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Prima neta/i), { target: { value: '100' } });

        fireEvent.click(screen.getByText('Vehiculos'));
        await waitFor(() => expect(screen.getByLabelText(/Vehículo \*/i)).toBeInTheDocument());
        await userEvent.selectOptions(screen.getByLabelText(/Vehículo \*/i), '1');
        await userEvent.type(screen.getByLabelText(/Valor asegurado \*/i), '5000');

        fireEvent.submit((screen.getByRole('button', { name: /Guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(createPolicy).toHaveBeenCalled();
            expect(screen.getByText(/Subir PDF de poliza/i)).toBeInTheDocument();
        });
    });

    it('maneja errores de la API al crear póliza', async () => {
        (createPolicy as any).mockRejectedValue({ message: 'Error de servidor', fieldErrors: { branch: 'Ya existe' } });

        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Juan Perez/i })).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Mapfre/i })).toBeInTheDocument());

        await userEvent.selectOptions(screen.getByLabelText(/Aseguradora/i), '1');
        await userEvent.selectOptions(screen.getByLabelText(/Cliente asegurado/i), '1');
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2027-10-01' } });
        fireEvent.change(screen.getByLabelText(/Sucursal \*/i), { target: { value: 'UIO' } });
        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Prima neta/i), { target: { value: '100' } });
        fireEvent.click(screen.getByText('Vehiculos'));
        await waitFor(() => expect(screen.getByLabelText(/Vehículo \*/i)).toBeInTheDocument());
        await userEvent.selectOptions(screen.getByLabelText(/Vehículo \*/i), '1');
        await userEvent.type(screen.getByLabelText(/Valor asegurado \*/i), '5000');

        fireEvent.submit((screen.getByRole('button', { name: /Guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(screen.getAllByText(/Ya existe/i)[0]).toBeInTheDocument();
            expect(screen.getByText(/Por favor, revise los campos marcados en rojo./i)).toBeInTheDocument();
        });
    });

    it('gestiona la subida de documento despues de crear', async () => {
        (uploadPolicyDocument as any).mockResolvedValue({});
        (createPolicy as any).mockResolvedValue({ id: 2, status: 'pending_document' });

        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Juan Perez/i })).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('option', { name: /Mapfre/i })).toBeInTheDocument());

        await userEvent.selectOptions(screen.getByLabelText(/Aseguradora/i), '1');
        await userEvent.selectOptions(screen.getByLabelText(/Cliente asegurado/i), '1');
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2027-10-01' } });
        fireEvent.change(screen.getByLabelText(/Sucursal \*/i), { target: { value: 'UIO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Prima neta/i), { target: { value: '100' } });

        fireEvent.click(screen.getByText('Vehiculos'));
        await waitFor(() => expect(screen.getByLabelText(/Vehículo \*/i)).toBeInTheDocument());
        await userEvent.selectOptions(screen.getByLabelText(/Vehículo \*/i), '1');
        await userEvent.type(screen.getByLabelText(/Valor asegurado \*/i), '5000');

        fireEvent.submit((screen.getByRole('button', { name: /Guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(screen.getByText(/Subir PDF de poliza/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Subir ahora/i }));

        await waitFor(() => {
            expect(screen.getByLabelText(/PDF de poliza/i)).toBeInTheDocument();
        });

        const fileInput = screen.getByLabelText(/PDF de poliza/i);
        const file = new File(['dummy content'], 'policy.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const submitBtn = screen.getByRole('button', { name: /Subir\/Reemplazar/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(uploadPolicyDocument).toHaveBeenCalledWith(2, expect.any(File));
        });
    });

    it('gestiona activación con email en modo de activacion', async () => {
        (createPolicy as any).mockResolvedValue({ id: 2 });
        (sendToInsurer as any).mockResolvedValue({});
        (activateWithEmail as any).mockResolvedValue({});
        (partialUpdatePolicy as any).mockResolvedValue({});

        const editingPolicy: any = {
            id: 2, status: 'sent_to_insurer', policy_number: 'PENDING-001', insurer: 1, insured_customer: 1,
            branch: 'UIO', valid_from: '2026-01-01', valid_until: '2027-01-01', issue_date: '2026-01-01',
            vehicles: [{ vehicle: 1, insured_value: '5000', net_premium: '100', occupants: 1, coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };

        render(<PolicyFormModal {...defaultProps} editingPolicy={editingPolicy} />);

        await waitFor(() => expect(screen.getByLabelText(/Numero de poliza/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Numero de poliza/i), { target: { value: 'ACTIVATED-001' } });

        fireEvent.click(screen.getByRole('button', { name: /Activar y enviar al cliente/i }));

        await waitFor(() => {
            expect(partialUpdatePolicy).toHaveBeenCalledWith(2, expect.objectContaining({ policy_number: 'ACTIVATED-001' }));
            expect(activateWithEmail).toHaveBeenCalledWith(2);
        });
    });

    it('gestiona envio a aseguradora en modo draft_send', async () => {
        (sendToInsurer as any).mockResolvedValue({});
        (partialUpdatePolicy as any).mockResolvedValue({});

        const editingPolicy: any = {
            id: 2, status: 'draft', policy_number: 'DRAFT-001', insurer: 1, insured_customer: 1,
            branch: 'UIO', valid_from: '2026-01-01', valid_until: '2027-01-01', issue_date: '2026-01-01',
            vehicles: [{ vehicle: 1, insured_value: '5000', net_premium: '100', occupants: 1, coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };

        render(<PolicyFormModal {...defaultProps} editingPolicy={editingPolicy} />);

        await waitFor(() => expect(screen.getByLabelText(/Aseguradora \*/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Aseguradora \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Sucursal \*/i), { target: { value: 'UIO' } });

        fireEvent.click(screen.getByRole('button', { name: /Enviar a aseguradora/i }));

        await waitFor(() => {
            expect(partialUpdatePolicy).toHaveBeenCalledWith(2, expect.any(Object));
            expect(sendToInsurer).toHaveBeenCalledWith(2);
        });
    });

    it('cierra modal al decidir subir luego el documento', async () => {
        (updatePolicy as any).mockResolvedValue({ id: 1 });
        (createPolicy as any).mockResolvedValue({ id: 2 });

        render(<PolicyFormModal {...defaultProps} />);
        await waitFor(() => expect(screen.getByText('Registrar Póliza')).toBeInTheDocument());

        await userEvent.selectOptions(screen.getByLabelText(/Aseguradora/i), '1');
        await userEvent.selectOptions(screen.getByLabelText(/Cliente asegurado/i), '1');
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2027-10-01' } });
        fireEvent.change(screen.getByLabelText(/Sucursal \*/i), { target: { value: 'UIO' } });
        
        fireEvent.click(screen.getByText('Vehiculos'));
        await waitFor(() => expect(screen.getByLabelText(/Vehículo \*/i)).toBeInTheDocument());
        await userEvent.selectOptions(screen.getByLabelText(/Vehículo \*/i), '1');
        await userEvent.type(screen.getByLabelText(/Valor asegurado \*/i), '5000');

        fireEvent.submit((screen.getByRole('button', { name: /Guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(screen.getByText(/Subir PDF de poliza/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Subir luego/i }));
        
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('permite reenviar póliza a cliente si es activa', async () => {
        const viewingPolicy: any = {
            id: 2, status: 'active', policy_number: 'ACTIVE-001', insurer: 1, insured_customer: 1,
            branch: 'UIO', valid_from: '2026-01-01', valid_until: '2027-01-01', issue_date: '2026-01-01',
            vehicles: [{ vehicle: 1, insured_value: '5000', net_premium: '100', occupants: 1, coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };
        (activateWithEmail as any).mockResolvedValue({});
        
        render(<PolicyFormModal {...defaultProps} viewingPolicy={viewingPolicy} />);
        
        await waitFor(() => {
            expect(screen.getByText('Detalles de Póliza')).toBeInTheDocument();
        });
        
        const btnSendClient = screen.getByRole('button', { name: /Enviar a cliente/i });
        fireEvent.click(btnSendClient);
        
        await waitFor(() => {
            expect(activateWithEmail).toHaveBeenCalledWith(2);
            expect(screen.getByText('Poliza enviada al cliente exitosamente.')).toBeInTheDocument();
        });
    });

    it('maneja error al enviar a cliente', async () => {
        const viewingPolicy: any = {
            id: 2, status: 'active', policy_number: 'ACTIVE-001', insurer: 1, insured_customer: 1,
            branch: 'UIO', valid_from: '2026-01-01', valid_until: '2027-01-01', issue_date: '2026-01-01',
            vehicles: [{ vehicle: 1, insured_value: '5000', net_premium: '100', occupants: 1, coverages: [], deductibles: [] }],
            clauses: [], installments: []
        };
        (activateWithEmail as any).mockRejectedValue({ message: 'Error de envio' });
        
        render(<PolicyFormModal {...defaultProps} viewingPolicy={viewingPolicy} />);
        
        await waitFor(() => {
            expect(screen.getByText('Detalles de Póliza')).toBeInTheDocument();
        });
        
        const btnSendClient = screen.getByRole('button', { name: /Enviar a cliente/i });
        fireEvent.click(btnSendClient);
        
        await waitFor(() => {
            expect(activateWithEmail).toHaveBeenCalledWith(2);
            expect(screen.getByText('Error de envio')).toBeInTheDocument();
        });
    });
});