import type { QuoteStatus } from '../../types/cotizacion';

export function getStatusUi(status: QuoteStatus): { className: string; label: string } {
    switch (status) {
        case 'draft':
            return { className: 'status-draft', label: 'Borrador' };
        case 'scoring_generated':
            return { className: 'status-scoring', label: 'Scoring Generado' };
        case 'manually_adjusted':
            return { className: 'status-adjusted', label: 'Ajuste Manual' };
        case 'approved':
            return { className: 'status-approved', label: 'Aprobada' };
        case 'rejected':
            return { className: 'status-rejected', label: 'Rechazada' };
        default:
            return { className: 'status-draft', label: String(status) };
    }
}

export function getRiskBandLabel(riskBand: string | null | undefined): string {
    if (riskBand === 'LOW') return 'Bajo';
    if (riskBand === 'MEDIUM') return 'Medio';
    if (riskBand === 'HIGH') return 'Alto';
    return String(riskBand || '-');
}

export function getRiskBandColor(riskBand: string | null | undefined): string {
    if (riskBand === 'LOW') return '#16a34a';
    if (riskBand === 'MEDIUM') return '#d97706';
    if (riskBand === 'HIGH') return '#dc2626';
    return '#64748b';
}

export function formatRate(rate: number | string | null | undefined): string {
    if (rate === null || rate === undefined || rate === '') return '-';
    const n = Number(rate);
    if (Number.isNaN(n)) return String(rate);
    return `${(n * 100).toFixed(4)}%`;
}

export function formatRiskScore(score: number | string | null | undefined): string {
    if (score === null || score === undefined || score === '') return '-';
    const n = Number(score);
    if (Number.isNaN(n)) return String(score);
    return `${(n * 100).toFixed(1)}%`;
}

export function getBmFactorName(name: string): string {
    const map: Record<string, string> = {
        bonus_malus: 'Bonus-Malus',
        credibility_cluster: 'Credibilidad cluster',
        credibility_individual: 'Credibilidad individual',
        renewal_cap: 'Tope renovación',
    };
    return map[name] ?? name;
}

