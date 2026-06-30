import { apiFetch, handleResponse, authHeaders } from './api';
import type {
    Cotizacion,
    CreateQuoteRequest,
    AdjustQuoteRequest,
    ApproveQuoteRequest,
    RejectQuoteRequest,
} from '../types/cotizacion';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de cotizaciones.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de cotizaciones.
/// </summary>
export async function getCotizacionesPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Cotizacion>> {
    const res = await apiFetch(`${API_URL}/quotes/management/${buildQueryString(params)}`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (res.status === 404) {
        return { count: 0, next: null, previous: null, results: [] };
    }

    const data = await handleResponse<Cotizacion[] | PaginatedResponse<Cotizacion>>(res, 'Error al obtener cotizaciones');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de cotizaciones.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getCotizaciones(params: ListQueryParams = {}): Promise<Cotizacion[]> {
    const page = await getCotizacionesPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de una cotización por su ID.
/// Parámetros: id (number). Envía el ID en la URL al backend y retorna los detalles de la cotización.
/// </summary>
export async function getCotizacionById(id: number): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/${id}/`, {
        method: 'GET',
        headers: authHeaders(),
    });
    return handleResponse<Cotizacion>(res, `Error al obtener la cotizacion ${id}`);
}

/// <summary>
/// Crea una nueva cotización utilizando el modelo de scoring.
/// Parámetros: data (CreateQuoteRequest). Envía los datos de la cotización en el cuerpo de la petición POST al backend.
/// </summary>
export async function createCotizacionML(data: CreateQuoteRequest): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Cotizacion>(res, 'Error al crear la cotizacion con scoring');
}

/// <summary>
/// Crea un borrador de cotización.
/// Parámetros: data (CreateQuoteRequest). Envía los datos en el cuerpo de la petición POST al backend.
/// </summary>
export async function createCotizacionDraft(data: CreateQuoteRequest): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/draft/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Cotizacion>(res, 'Error al crear el borrador de la cotizacion');
}

/// <summary>
/// Genera el scoring para una cotización existente.
/// Parámetros: id (number). Envía el ID en la URL mediante una petición POST al backend.
/// </summary>
export async function generateScoring(id: number): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/${id}/generate-scoring/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
    });
    return handleResponse<Cotizacion>(res, `Error al generar scoring para la cotizacion ${id}`);
}

/// <summary>
/// Ajusta manualmente los valores de una cotización.
/// Parámetros: id (number), data (AdjustQuoteRequest). Envía los datos de ajuste en el cuerpo de una petición PATCH al backend.
/// </summary>
export async function adjustCotizacion(id: number, data: AdjustQuoteRequest): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/${id}/adjust/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Cotizacion>(res, `Error al ajustar la cotizacion ${id}`);
}

/// <summary>
/// Aprueba una cotización.
/// Parámetros: id (number), data (ApproveQuoteRequest). Envía opcionalmente datos de aprobación en una petición PATCH al backend.
/// </summary>
export async function approveCotizacion(id: number, data: ApproveQuoteRequest = {}): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/${id}/approve/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Cotizacion>(res, `Error al aprobar la cotizacion ${id}`);
}

/// <summary>
/// Rechaza una cotización.
/// Parámetros: id (number), data (RejectQuoteRequest). Envía la razón de rechazo en una petición PATCH al backend.
/// </summary>
export async function rejectCotizacion(id: number, data: RejectQuoteRequest): Promise<Cotizacion> {
    const res = await apiFetch(`${API_URL}/quotes/management/${id}/reject/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Cotizacion>(res, `Error al rechazar la cotizacion ${id}`);
}
