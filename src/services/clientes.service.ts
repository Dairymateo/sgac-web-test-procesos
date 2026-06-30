import type { Cliente, FormCliente, CustomerFiles } from '../types/cliente';
import { authHeaders, authHeadersMultipart, handleResponse, apiFetch } from './api';
import { FILE_FIELD_MAP, fromBackendCustomer, toBackendCustomerPayload } from '../mappers/customer.mapper';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de clientes.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de clientes.
/// </summary>
export async function getClientesPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Cliente>> {
    const res = await apiFetch(`${API_URL}/customers/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<any[] | PaginatedResponse<any>>(res, 'Error al cargar clientes');
    const page = normalizePaginatedResponse(data);
    return {
        ...page,
        results: page.results.map(fromBackendCustomer),
    };
}

/// <summary>
/// Obtiene una lista de clientes.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getClientes(params: ListQueryParams = {}): Promise<Cliente[]> {
    const page = await getClientesPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de un cliente por su ID.
/// Parámetros: id (number). Envía el ID en la URL al backend y retorna los detalles del cliente.
/// </summary>
export async function getCliente(id: number): Promise<Cliente> {
    const res = await apiFetch(`${API_URL}/customers/management/${id}/`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<any>(res, 'Error al obtener cliente');
    return fromBackendCustomer(data);
}

function buildCustomerFormData(data: FormCliente, files?: Record<string, File | null>): FormData {
    const formData = new FormData();
    const payload = toBackendCustomerPayload(data);

    for (const [key, value] of Object.entries(payload)) {
        if (value === null || value === undefined || value === '') continue;
        formData.append(key, String(value));
    }

    if (files) {
        for (const [key, value] of Object.entries(files)) {
            if (value instanceof File) {
                const backendKey = FILE_FIELD_MAP[key] || key;
                formData.append(backendKey, value);
            }
        }
    }

    return formData;
}

/// <summary>
/// Crea un nuevo cliente y opcionalmente adjunta archivos.
/// Parámetros: data (FormCliente), files (Record<string, File>). Envía los datos y archivos como multipart/form-data al backend.
/// </summary>
export async function createCliente(data: FormCliente, files?: Record<string, File | null>): Promise<Cliente> {
    const res = await apiFetch(`${API_URL}/customers/management/create/`, {
        method: 'POST',
        headers: authHeadersMultipart(),
        body: buildCustomerFormData(data, files),
    });
    const item = await handleResponse<any>(res, 'Error al crear cliente');
    return fromBackendCustomer(item);
}

/// <summary>
/// Actualiza completamente un cliente existente, manejando subida de archivos si es necesario.
/// Parámetros: id (number), data (FormCliente), files (Record<string, File>). Envía los datos como JSON o multipart/form-data al backend.
/// </summary>
export async function updateCliente(id: number, data: FormCliente, files?: Record<string, File | null>): Promise<Cliente> {
    const hasFiles = !!files && Object.values(files).some((f) => f instanceof File);

    if (hasFiles) {
        const res = await apiFetch(`${API_URL}/customers/management/${id}/partial-update/`, {
            method: 'PATCH',
            headers: authHeadersMultipart(),
            body: buildCustomerFormData(data, files),
        });
        const item = await handleResponse<any>(res, 'Error al actualizar cliente');
        return fromBackendCustomer(item);
    }

    const payload = toBackendCustomerPayload(data);

    const res = await apiFetch(`${API_URL}/customers/management/${id}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });
    const item = await handleResponse<any>(res, 'Error al actualizar cliente');
    return fromBackendCustomer(item);
}

/// <summary>
/// Actualiza parcialmente un cliente existente.
/// Parámetros: id (number), data (Partial<FormCliente>). Envía los campos a modificar al backend mediante una petición PATCH.
/// </summary>
export async function partialUpdateCliente(id: number, data: Partial<FormCliente>): Promise<Cliente> {
    const payload = toBackendCustomerPayload(data);

    const res = await apiFetch(`${API_URL}/customers/management/${id}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });
    const item = await handleResponse<any>(res, 'Error al actualizar cliente');
    return fromBackendCustomer(item);
}

/// <summary>
/// Activa un cliente inactivo.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateCliente(id: number): Promise<Cliente> {
    const res = await apiFetch(`${API_URL}/customers/management/${id}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    const item = await handleResponse<any>(res, 'Error al activar cliente');
    return fromBackendCustomer(item);
}

/// <summary>
/// Desactiva un cliente activo, verificando previamente si tiene relaciones.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateCliente(id: number): Promise<Cliente> {
    const res = await apiFetch(`${API_URL}/customers/management/${id}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });

    if (res.status === 409) {
        throw new Error('No se puede desactivar el cliente porque tiene vehículos, cotizaciones o siniestros relacionados.');
    }

    const item = await handleResponse<any>(res, 'Error al desactivar cliente');
    return fromBackendCustomer(item);
}

/// <summary>
/// Obtiene la URL prefirmada de un documento específico de un cliente.
/// Parámetros: id (number), fieldName (keyof CustomerFiles). Envía ambos parámetros en la URL al backend mediante GET.
/// </summary>
export async function getCustomerDocumentUrl(id: number, fieldName: keyof CustomerFiles): Promise<string> {
    const res = await apiFetch(`${API_URL}/customers/management/${id}/documents/${fieldName}/url/`, {
        method: 'GET',
        headers: authHeaders(),
    });
    const data = await handleResponse<{ url: string }>(res, 'Error al obtener URL del documento');
    return data.url;
}
