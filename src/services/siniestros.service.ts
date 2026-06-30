import { apiFetch, authHeaders, authHeadersMultipart, handleResponse } from './api';
import type { Claim, ClaimWritePayload } from '../types/siniestro';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function hasDocumentFiles(data: ClaimWritePayload): boolean {
    return Boolean(data.documents?.some(doc => doc.file instanceof File));
}

function toMultipartPayload(data: ClaimWritePayload): FormData {
    const formData = new FormData();
    const documents = data.documents || [];
    const normalized = {
        ...data,
        documents: documents.map(({ file: _file, ...rest }) => rest),
    };

    formData.append('payload', JSON.stringify(normalized));

    for (const [index, document] of documents.entries()) {
        if (document.file instanceof File) {
            formData.append(`documents.${index}.file`, document.file);
        }
    }

    return formData;
}

async function saveClaim(
    method: 'POST' | 'PUT' | 'PATCH',
    url: string,
    data: ClaimWritePayload,
    defaultMessage: string,
): Promise<Claim> {
    const useMultipart = hasDocumentFiles(data);
    const res = await apiFetch(url, {
        method,
        headers: useMultipart ? authHeadersMultipart() : authHeaders(),
        body: useMultipart ? toMultipartPayload(data) : JSON.stringify(data),
    });
    return handleResponse<Claim>(res, defaultMessage);
}

/// <summary>
/// Obtiene una página de siniestros.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de siniestros.
/// </summary>
export async function getSiniestrosPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Claim>> {
    const res = await apiFetch(`${API_URL}/claims/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<Claim[] | PaginatedResponse<Claim>>(res, 'Error al cargar siniestros');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de siniestros.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getSiniestros(params: ListQueryParams = {}): Promise<Claim[]> {
    const page = await getSiniestrosPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de un siniestro por su ID.
/// Parámetros: id (number). Envía el ID en la URL al backend y retorna los detalles del siniestro.
/// </summary>
export async function getSiniestro(id: number): Promise<Claim> {
    const res = await apiFetch(`${API_URL}/claims/management/${id}/`, {
        headers: authHeaders(),
    });
    return handleResponse<Claim>(res, 'Error al obtener siniestro');
}

/// <summary>
/// Crea un nuevo siniestro y sus documentos adjuntos.
/// Parámetros: data (ClaimWritePayload). Envía los datos como JSON o multipart/form-data si hay archivos al backend en una petición POST.
/// </summary>
export async function createSiniestro(data: ClaimWritePayload): Promise<Claim> {
    return saveClaim('POST', `${API_URL}/claims/management/create/`, data, 'Error al crear siniestro');
}

/// <summary>
/// Actualiza completamente un siniestro existente.
/// Parámetros: id (number), data (ClaimWritePayload). Envía los datos completos y archivos al backend mediante PUT.
/// </summary>
export async function updateSiniestro(id: number, data: ClaimWritePayload): Promise<Claim> {
    return saveClaim('PUT', `${API_URL}/claims/management/${id}/update/`, data, 'Error al actualizar siniestro');
}

/// <summary>
/// Actualiza parcialmente un siniestro existente.
/// Parámetros: id (number), data (Partial<ClaimWritePayload>). Envía los campos a modificar al backend mediante PATCH.
/// </summary>
export async function partialUpdateSiniestro(id: number, data: Partial<ClaimWritePayload>): Promise<Claim> {
    return saveClaim('PATCH', `${API_URL}/claims/management/${id}/partial-update/`, data as ClaimWritePayload, 'Error al actualizar siniestro');
}

/// <summary>
/// Reactiva un siniestro anulado.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateSiniestro(id: number): Promise<Claim> {
    const res = await apiFetch(`${API_URL}/claims/management/${id}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Claim>(res, 'Error al reactivar siniestro');
}

/// <summary>
/// Anula un siniestro.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateSiniestro(id: number): Promise<Claim> {
    const res = await apiFetch(`${API_URL}/claims/management/${id}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Claim>(res, 'Error al anular siniestro');
}

/// <summary>
/// Reporta un siniestro a la aseguradora.
/// Parámetros: id (number). Envía el ID en la URL en una petición POST al backend.
/// </summary>
export async function reportSiniestroToInsurer(id: number): Promise<Claim> {
    const res = await apiFetch(`${API_URL}/claims/management/${id}/report-to-insurer/`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return handleResponse<Claim>(res, 'Error al reportar siniestro a aseguradora');
}

/// <summary>
/// Obtiene la URL pre-firmada de un documento adjunto al siniestro.
/// Parámetros: claimId (number), documentId (number). Realiza una petición GET al backend con ambos IDs en la URL.
/// </summary>
export async function getClaimDocumentUrl(claimId: number, documentId: number): Promise<{ url: string }> {
    const res = await apiFetch(`${API_URL}/claims/management/${claimId}/documents/${documentId}/url/`, {
        headers: authHeaders(),
    });
    return handleResponse<{ url: string }>(res, 'Error al obtener URL temporal del documento');
}
