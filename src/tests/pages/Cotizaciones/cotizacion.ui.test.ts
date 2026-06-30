/// <summary>
/// cotizacion.ui.test.ts — coverage tests
/// </summary>
import { describe, it, expect } from 'vitest';
import { getStatusUi, getRiskBandLabel } from '../../../pages/Cotizaciones/cotizacion.ui';
import type { QuoteStatus } from '../../../types/cotizacion';

describe('cotizacion.ui', () => {
    describe('getStatusUi', () => {
        it('debe retornar status-draft para draft', () => {
            expect(getStatusUi('draft')).toEqual({ className: 'status-draft', label: 'Borrador' });
        });

        it('debe retornar status-scoring para scoring_generated', () => {
            expect(getStatusUi('scoring_generated')).toEqual({ className: 'status-scoring', label: 'Scoring Generado' });
        });

        it('debe retornar status-adjusted para manually_adjusted', () => {
            expect(getStatusUi('manually_adjusted')).toEqual({ className: 'status-adjusted', label: 'Ajuste Manual' });
        });

        it('debe retornar status-approved para approved', () => {
            expect(getStatusUi('approved')).toEqual({ className: 'status-approved', label: 'Aprobada' });
        });

        it('debe retornar status-rejected para rejected', () => {
            expect(getStatusUi('rejected')).toEqual({ className: 'status-rejected', label: 'Rechazada' });
        });

        it('debe retornar status-draft y el label original para valor default', () => {
            expect(getStatusUi('unknown_status' as QuoteStatus)).toEqual({ className: 'status-draft', label: 'unknown_status' });
        });
    });

    describe('getRiskBandLabel', () => {
        it('debe retornar Bajo para LOW', () => {
            expect(getRiskBandLabel('LOW')).toBe('Bajo');
        });

        it('debe retornar Medio para MEDIUM', () => {
            expect(getRiskBandLabel('MEDIUM')).toBe('Medio');
        });

        it('debe retornar Alto para HIGH', () => {
            expect(getRiskBandLabel('HIGH')).toBe('Alto');
        });

        it('debe retornar el string o guion si no coincide', () => {
            expect(getRiskBandLabel(null)).toBe('-');
            expect(getRiskBandLabel(undefined)).toBe('-');
            expect(getRiskBandLabel('UNKNOWN')).toBe('UNKNOWN');
        });
    });
});
