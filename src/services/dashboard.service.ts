import { apiFetch, authHeaders, handleResponse } from './api';
import type { DashboardSummary, DashboardPeriod } from '../types/dashboard';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene el resumen del dashboard según un período dado.
/// Parámetros: period (DashboardPeriod). Envía el período como query string en la URL al backend mediante GET.
/// </summary>
export async function getDashboardSummary(period: DashboardPeriod = 'month'): Promise<DashboardSummary> {
    const res = await apiFetch(`${API_URL}/dashboard/summary/?period=${period}`, {
        headers: authHeaders(),
    });
    return handleResponse<DashboardSummary>(res, 'Error al cargar dashboard');
}
