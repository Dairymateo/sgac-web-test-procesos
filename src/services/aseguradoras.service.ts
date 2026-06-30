import { apiFetch, authHeaders, handleResponse } from './api';
import type { Aseguradora, FormAseguradora } from '../types/aseguradora';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de aseguradoras.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta paginados al backend y retorna una respuesta paginada.
/// </summary>
export async function getAseguradorasPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Aseguradora>> {
    const res = await apiFetch(`${API_URL}/insurers/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<Aseguradora[] | PaginatedResponse<Aseguradora>>(res, 'Error al cargar aseguradoras');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de aseguradoras.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getAseguradoras(params: ListQueryParams = {}): Promise<Aseguradora[]> {
    const page = await getAseguradorasPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de una aseguradora por su ID.
/// Parámetros: id (number). Envía el ID en la URL al backend y retorna los detalles de la aseguradora.
/// </summary>
export async function getAseguradora(id: number): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/${id}/`, {
        headers: authHeaders(),
    });
    return handleResponse<Aseguradora>(res, 'Error al obtener aseguradora');
}

/// <summary>
/// Crea una nueva aseguradora.
/// Parámetros: data (Omit<FormAseguradora, 'id'>). Envía los datos de la aseguradora en el cuerpo de la petición POST al backend.
/// </summary>
export async function createAseguradora(data: Omit<FormAseguradora, 'id'>): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Aseguradora>(res, 'Error al crear aseguradora');
}

/// <summary>
/// Actualiza completamente una aseguradora existente.
/// Parámetros: id (number), data (FormAseguradora). Envía los datos completos de la aseguradora en el cuerpo de la petición PUT al backend.
/// </summary>
export async function updateAseguradora(id: number, data: FormAseguradora): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/${id}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Aseguradora>(res, 'Error al actualizar aseguradora');
}

/// <summary>
/// Actualiza parcialmente una aseguradora existente.
/// Parámetros: id (number), data (Partial<FormAseguradora>). Envía los campos a modificar en el cuerpo de la petición PATCH al backend.
/// </summary>
export async function partialUpdateAseguradora(id: number, data: Partial<FormAseguradora>): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/${id}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Aseguradora>(res, 'Error al actualizar parcialmente aseguradora');
}

/// <summary>
/// Activa una aseguradora inactiva.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateAseguradora(id: number): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/${id}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Aseguradora>(res, 'Error al activar aseguradora');
}

/// <summary>
/// Desactiva una aseguradora activa.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateAseguradora(id: number): Promise<Aseguradora> {
    const res = await apiFetch(`${API_URL}/insurers/management/${id}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Aseguradora>(res, 'Error al desactivar aseguradora');
}
