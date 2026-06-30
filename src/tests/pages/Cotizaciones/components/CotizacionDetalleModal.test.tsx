import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionDetalleModal from '../../../../pages/Cotizaciones/components/CotizacionDetalleModal';
import { getCotizacionById } from '../../../../services/cotizaciones.service';
import { getCliente } from '../../../../services/clientes.service';
import { getAseguradora } from '../../../../services/aseguradoras.service';

vi.mock('../../../../services/cotizaciones.service', () => ({ getCotizacionById: vi.fn() }));
vi.mock('../../../../services/clientes.service', () => ({ getCliente: vi.fn() }));
vi.mock('../../../../services/aseguradoras.service', () => ({ getAseguradora: vi.fn() }));

describe('CotizacionDetalleModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no renderiza si isOpen es false', () => {
        const { container } = render(<CotizacionDetalleModal isOpen={false} onClose={vi.fn()} cotizacionId={1} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renderiza todos los campos opcionales cuando estan presentes', async () => {
        (getCotizacionById as any).mockResolvedValue({
            id: 1,
            status: 'approved',
            customer_code: 'C001',
            insured_client: 1,
            insurer: 1,
            insurer_name: 'Seguros ABC',
            policy_id: 100,
            policy_status: 'Activa',
            total_vehicle_value: '50000',
            suggested_premium: '1000',
            final_premium: '1200',
            risk_score: '85',
            risk_band: 'low',
            manual_override_reason: 'Descuento especial',
            rejection_reason: 'N/A',
            vehicles: [
                {
                    vehicle: 1,
                    license_plate: 'ABC-123',
                    brand: 'Ford',
                    model: 'F150',
                    vehicle_value: '25000',
                    suggested_premium: '500',
                    final_premium: '600',
                    vehicle_value_override_reason: 'Ajuste manual',
                },
                {
                    vehicle: 2,
                }
            ],
            ml_response_payload: {
                vehicles: [{
                    rate_breakdown: {
                        segment: 'A1',
                        segment_base_rate: 0.05,
                        commercial_rate: 0.06,
                        individual_factor: 1.2,
                        factors: [
                            { name: 'bonus_malus', factor: 0.9, detail: { weighted_score: 0.5 } },
                            { name: 'credibility_cluster', factor: 1.1, detail: { cluster_id: 1, cluster_size: 100, beta: 0.8, cluster_median_rate: 0.05, cluster_rate: 0.055 } },
                            { name: 'credibility_individual', factor: 1, detail: { num_renewals: 2, alpha: 0.5, individual_rate: 0.04, blended_rate: 0.045 } },
                            { name: 'renewal_cap', factor: 1, detail: { max_annual_change_pct: 10, previous_rate: 0.05, cap_min: 0.045, cap_max: 0.055, cap_applied: true } }
                        ],
                        pre_cap_rate: 0.054,
                        cap_applied: true,
                        final_rate: 0.055
                    },
                    explainability: {
                        top_factors: [
                            { feature: 'age', value_used: 25, contribution: 'negative' },
                            { feature: 'vehicle_value', value_used: 15000, contribution: 'positive' }
                        ]
                    },
                    model_version: 'v1.0.0',
                    inference_id: 'inf-123',
                    inference_at: '2024-05-15T10:00:00Z'
                }]
            }
        });
        (getCliente as any).mockResolvedValue({ id: 1, first_names: 'Juan', last_names: 'Perez', customer_code: 'C001' });
        (getAseguradora as any).mockResolvedValue({ id: 1, name: 'Mapfre' });

        render(<CotizacionDetalleModal isOpen={true} onClose={vi.fn()} cotizacionId={1} />);

        await waitFor(() => expect(screen.getByText(/Detalles de la Cotización #1/)).toBeInTheDocument());

        expect(screen.getByText(/Póliza creada:/)).toBeInTheDocument();
        expect(screen.getByText(/#100/)).toBeInTheDocument();
        expect(screen.getByText(/Activa/)).toBeInTheDocument();

        expect(screen.getByText(/Vehículo 1: ABC-123 - Ford F150/)).toBeInTheDocument();
        expect(screen.getByText(/Vehículo 2: Vehículo ID 2/)).toBeInTheDocument();

        expect(screen.getByText(/Valor asegurado: \$25.000,00/)).toBeInTheDocument();
        expect(screen.getByText(/Prima sugerida: \$500,00/)).toBeInTheDocument();
        expect(screen.getByText(/Prima final: \$600,00/)).toBeInTheDocument();
        expect(screen.getByText(/Ajuste: Ajuste manual/)).toBeInTheDocument();

        expect(screen.getByText(/Valor total asegurado:/)).toBeInTheDocument();
        expect(screen.getByText(/\$50.000,00/)).toBeInTheDocument();

        expect(screen.getByText(/Motivo:/)).toBeInTheDocument();
        expect(screen.getByText(/Descuento especial/)).toBeInTheDocument();
        expect(screen.getByText(/Motivo de Rechazo/)).toBeInTheDocument();
        expect(screen.getByText(/N\/A/)).toBeInTheDocument();

        // Verificar cobertura de ML UI
        expect(screen.getByText(/Desglose de tasa/)).toBeInTheDocument();
        expect(screen.getByText(/Tasa base segmento:/)).toBeInTheDocument();
        expect(screen.getByText(/Tasa comercial referencia:/)).toBeInTheDocument();
        expect(screen.getByText(/Factor individual:/)).toBeInTheDocument();
        expect(screen.getByText(/Puntuación siniestros:/)).toBeInTheDocument();
        expect(screen.getByText(/ID cluster:/)).toBeInTheDocument();
        expect(screen.getByText(/Nº renovaciones:/)).toBeInTheDocument();
        expect(screen.getByText(/Cambio máx. anual:/)).toBeInTheDocument();
        
        expect(screen.getByText(/Factores explicativos/)).toBeInTheDocument();
        expect(screen.getByText(/Edad del asegurado/)).toBeInTheDocument();
        expect(screen.getByText(/Valor del vehículo/)).toBeInTheDocument();
        expect(screen.getByText(/↑ riesgo/)).toBeInTheDocument();
        expect(screen.getByText(/↓ riesgo/)).toBeInTheDocument();

        expect(screen.getByText(/Trazabilidad ML/)).toBeInTheDocument();
        expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
        expect(screen.getByText(/inf-123/)).toBeInTheDocument();
    });

    it('maneja error de API', async () => {
        (getCotizacionById as any).mockRejectedValue(new Error('Network error'));
        
        render(<CotizacionDetalleModal isOpen={true} onClose={vi.fn()} cotizacionId={1} />);

        await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
    });
});