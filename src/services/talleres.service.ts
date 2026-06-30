import { apiFetch, authHeaders, handleResponse } from './api';
import type { Taller, WorkshopRead, WorkshopWritePayload } from '../types/taller';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de talleres.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de talleres.
/// </summary>
export async function getTalleresPage(params: ListQueryParams = {}): Promise<PaginatedResponse<WorkshopRead>> {
    const res = await apiFetch(`${API_URL}/workshops/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<WorkshopRead[] | PaginatedResponse<WorkshopRead>>(res, 'Error al cargar talleres');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de talleres.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getTalleres(params: ListQueryParams = {}): Promise<Taller[]> {
    const page = await getTalleresPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de un taller por su ID.
/// Parámetros: taller_id (number). Envía el ID en la URL al backend y retorna los detalles del taller.
/// </summary>
export async function getTaller(taller_id: number): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/${taller_id}/`, {
        headers: authHeaders(),
    });
    return handleResponse<WorkshopRead>(res, 'Error al obtener taller');
}

/// <summary>
/// Crea un nuevo taller.
/// Parámetros: data (WorkshopWritePayload). Envía los datos del taller en el cuerpo de la petición POST al backend.
/// </summary>
export async function createTaller(data: WorkshopWritePayload): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<WorkshopRead>(res, 'Error al crear taller');
}

/// <summary>
/// Actualiza completamente un taller existente.
/// Parámetros: taller_id (number), data (WorkshopWritePayload). Envía los datos completos del taller en el cuerpo de la petición PUT al backend.
/// </summary>
export async function updateTaller(taller_id: number, data: WorkshopWritePayload): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/${taller_id}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<WorkshopRead>(res, 'Error al actualizar taller');
}

/// <summary>
/// Actualiza parcialmente un taller existente.
/// Parámetros: taller_id (number), data (Partial<WorkshopWritePayload>). Envía los campos a modificar en el cuerpo de la petición PATCH al backend.
/// </summary>
export async function partialUpdateTaller(taller_id: number, data: Partial<WorkshopWritePayload>): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/${taller_id}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<WorkshopRead>(res, 'Error al actualizar parcialmente taller');
}

/// <summary>
/// Activa un taller inactivo.
/// Parámetros: taller_id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateTaller(taller_id: number): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/${taller_id}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<WorkshopRead>(res, 'Error al activar taller');
}

/// <summary>
/// Desactiva un taller activo.
/// Parámetros: taller_id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateTaller(taller_id: number): Promise<Taller> {
    const res = await apiFetch(`${API_URL}/workshops/management/${taller_id}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<WorkshopRead>(res, 'Error al desactivar taller');
}
