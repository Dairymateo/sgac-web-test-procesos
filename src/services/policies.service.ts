import { apiFetch, authHeaders, authHeadersMultipart, handleResponse } from './api';
import type { Policy, PolicyWritePayload } from '../types/policy';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de pólizas.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de pólizas.
/// </summary>
export async function getPoliciesPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Policy>> {
    const res = await apiFetch(`${API_URL}/policies/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<Policy[] | PaginatedResponse<Policy>>(res, 'Error al cargar polizas');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de pólizas.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getPolicies(params: ListQueryParams = {}): Promise<Policy[]> {
    const page = await getPoliciesPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de una póliza por su ID.
/// Parámetros: policyId (number). Envía el ID en la URL al backend y retorna los detalles de la póliza.
/// </summary>
export async function getPolicy(policyId: number): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/`, {
        headers: authHeaders(),
    });
    return handleResponse<Policy>(res, 'Error al obtener poliza');
}

/// <summary>
/// Crea una nueva póliza.
/// Parámetros: data (PolicyWritePayload). Envía los datos de la póliza en el cuerpo de la petición POST al backend.
/// </summary>
export async function createPolicy(data: PolicyWritePayload): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Policy>(res, 'Error al crear poliza');
}

/// <summary>
/// Actualiza completamente una póliza existente.
/// Parámetros: policyId (number), data (PolicyWritePayload). Envía los datos completos de la póliza en el cuerpo de la petición PUT al backend.
/// </summary>
export async function updatePolicy(policyId: number, data: PolicyWritePayload): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Policy>(res, 'Error al actualizar poliza');
}

/// <summary>
/// Actualiza parcialmente una póliza existente.
/// Parámetros: policyId (number), data (Partial<PolicyWritePayload>). Envía los campos a modificar en el cuerpo de la petición PATCH al backend.
/// </summary>
export async function partialUpdatePolicy(policyId: number, data: Partial<PolicyWritePayload>): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Policy>(res, 'Error al actualizar poliza');
}

/// <summary>
/// Envía la póliza a la aseguradora.
/// Parámetros: policyId (number). Envía el ID de la póliza en la URL mediante una petición POST al backend.
/// </summary>
export async function sendToInsurer(policyId: number): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/send-to-insurer/`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return handleResponse<Policy>(res, 'Error al enviar poliza a la aseguradora');
}

/// <summary>
/// Activa la póliza y envía un correo de confirmación.
/// Parámetros: policyId (number). Envía el ID en la URL mediante una petición POST al backend.
/// </summary>
export async function activateWithEmail(policyId: number): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/activate-with-email/`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return handleResponse<Policy>(res, 'Error al activar poliza');
}

/// <summary>
/// Activa una póliza.
/// Parámetros: policyId (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activatePolicy(policyId: number): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Policy>(res, 'Error al activar poliza');
}

/// <summary>
/// Desactiva una póliza.
/// Parámetros: policyId (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivatePolicy(policyId: number): Promise<Policy> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Policy>(res, 'Error al desactivar poliza');
}

/// <summary>
/// Sube un documento PDF para la póliza.
/// Parámetros: policyId (number), file (File). Envía el archivo como multipart/form-data mediante una petición PATCH al backend.
/// </summary>
export async function uploadPolicyDocument(policyId: number, file: File): Promise<Policy> {
    const formData = new FormData();
    formData.append('policy_document', file);

    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/document/`, {
        method: 'PATCH',
        headers: authHeadersMultipart(),
        body: formData,
    });
    return handleResponse<Policy>(res, 'Error al subir documento de poliza');
}

/// <summary>
/// Obtiene la URL temporal del documento de una póliza.
/// Parámetros: policyId (number). Realiza una petición GET al backend pasando el ID en la URL.
/// </summary>
export async function getPolicyDocumentUrl(policyId: number): Promise<string> {
    const res = await apiFetch(`${API_URL}/policies/management/${policyId}/document/url/`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<{ url: string }>(res, 'Documento no disponible');
    return data.url;
}
