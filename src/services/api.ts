import { refreshTokenRequest } from './auth.service';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

export type ApiFieldErrors = Record<string, string>;

export class ApiError extends Error {
    readonly status: number;
    readonly code?: string;
    readonly requestId?: string;
    readonly fieldErrors: ApiFieldErrors;

    constructor(
        message: string,
        options: {
            status: number;
            code?: string;
            requestId?: string;
            fieldErrors?: ApiFieldErrors;
        },
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = options.status;
        this.code = options.code;
        this.requestId = options.requestId;
        this.fieldErrors = options.fieldErrors ?? {};
    }
}

const processQueue = (error: any, token: string | null = null) => {
    for (const prom of failedQueue) {
        if (error) {
            prom.reject(error);
        } else if (token !== null) {
            prom.resolve(token);
        }
    }
    failedQueue = [];
};

/// <summary>
/// Clase para mantener compatibilidad con servicios que requieren authHeaders.
/// No recibe parámetros directos de servicio.
/// </summary>
export class GlobalApiError extends Error {
    public isGlobal = true;
    readonly requestId?: string;

    constructor(message: string, requestId?: string) {
        super(message);
        this.name = 'GlobalApiError';
        this.requestId = requestId;
    }
}

/// <summary>
/// Genera los encabezados de autenticación básicos para las peticiones.
/// No recibe parámetros y envía el token Bearer al backend.
/// </summary>
export function authHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/// <summary>
/// Genera los encabezados de autenticación para peticiones multipart (archivos).
/// No recibe parámetros y envía el token Bearer al backend.
/// </summary>
export function authHeadersMultipart(): HeadersInit {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export function isAccessTokenExpiredOrNearExpiry(thresholdSeconds = 60): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (typeof payload?.exp !== 'number') return false;

    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp - nowSeconds <= thresholdSeconds;
}

async function refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        localStorage.removeItem('token');
        globalThis.dispatchEvent(new Event('auth:session-expired'));
        throw new Error('SesiÃ³n expirada');
    }

    if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;
    try {
        const data = await refreshTokenRequest(refreshToken);
        const access = data.access;
        localStorage.setItem('token', access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        processQueue(null, access);
        globalThis.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { token: access } }));
        return access;
    } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        globalThis.dispatchEvent(new Event('auth:session-expired'));
        throw err;
    } finally {
        isRefreshing = false;
    }
}

function withAuthorization(init: RequestInit | undefined, token: string): RequestInit {
    const newInit = { ...init };
    const headers = new Headers(newInit?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    newInit.headers = headers;
    return newInit;
}

function firstMessage(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (!Array.isArray(value)) return null;

    const first = value[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null && 'message' in first) {
        const message = (first as { message?: unknown }).message;
        return typeof message === 'string' ? message : null;
    }
    return null;
}

function parseStructuredFieldErrors(data: any): ApiFieldErrors {
    const source = data?.error ?? data;
    const errors: ApiFieldErrors = {};

    for (const rawFields of [source?.fields, source?.field_errors, source]) {
        if (typeof rawFields !== 'object' || rawFields === null || Array.isArray(rawFields)) {
            continue;
        }

        for (const [field, value] of Object.entries(rawFields)) {
            if (['detail', 'non_field_errors', 'error', 'message'].includes(field)) continue;
            const message = firstMessage(value);
            if (message && !errors[field]) errors[field] = message;
        }
    }

    return errors;
}

function parseJsonResponse(data: any): string | null {
    if (typeof data !== 'object' || data === null) return null;

    if (data.detail && typeof data.detail === 'string') {
        return data.detail;
    }
    if (data.message && typeof data.message === 'string') {
        return data.message;
    }
    if (data.error && typeof data.error === 'string') {
        return data.error;
    }
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
        return data.non_field_errors.join(', ');
    }

    const stringifyValue = (val: any): string => {
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) {
            return val.map((v) => stringifyValue(v)).join(', ');
        }
        if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
        }
        return String(val);
    };

    if (Array.isArray(data)) {
        return stringifyValue(data);
    }

    try {
        const parts = Object.entries(data).map(
            ([key, value]) => `${key}: ${stringifyValue(value)}`
        );

        return parts.length > 0 ? parts.join('; ') : null;
    } catch {
        return 'Error al procesar la respuesta del servidor';
    }
}

function parseHtmlError(_bodyText: string, status: number): string {
    if (status >= 500) {
        return 'Servicio no disponible, intentelo de nuevo mas tarde.';
    }
    return `Error del servidor (${status})`;
}

async function getErrorDetails(
    res: Response,
    defaultMessage: string,
): Promise<{ message: string; code?: string; requestId?: string; fieldErrors?: ApiFieldErrors }> {
    if (res.status === 403) {
        return { message: 'No tienes permisos para realizar esta acción.' };
    }
    if (res.status === 404) {
        return { message: 'El recurso solicitado no fue encontrado.' };
    }
    if (res.status === 409) {
        try {
            const bodyText = await res.clone().text();
            const data = JSON.parse(bodyText);
            const apiError = data?.error;
            return {
                message: apiError?.message || 'El recurso no puede modificarse porque tiene informacion relacionada.',
                code: apiError?.code,
                requestId: apiError?.request_id,
                fieldErrors: {},
            };
        } catch {
            return { message: 'El recurso no puede modificarse porque tiene informacion relacionada.' };
        }
    }

    try {
        const bodyText = await res.text();
        try {
            const data = JSON.parse(bodyText);
            const apiError = data?.error;
            const fieldErrors = parseStructuredFieldErrors(data);
            if (apiError?.code === 'validation_error' && Object.keys(fieldErrors).length > 0) {
                return {
                    message: apiError.message || 'Invalid data.',
                    code: apiError.code,
                    requestId: apiError.request_id,
                    fieldErrors,
                };
            }
            const parsedJson = parseJsonResponse(data);
            if (parsedJson) {
                return {
                    message: parsedJson,
                    code: apiError?.code,
                    requestId: apiError?.request_id,
                    fieldErrors,
                };
            }
        } catch {
            return { message: parseHtmlError(bodyText, res.status) };
        }
    } catch {  }

    return { message: defaultMessage };
}

async function getServerRequestId(res: Response): Promise<string | undefined> {
    const headerRequestId = res.headers?.get('x-request-id') || res.headers?.get('X-Request-ID');
    if (headerRequestId) return headerRequestId;

    try {
        const bodyText = await res.clone().text();
        const data = JSON.parse(bodyText);
        return data?.error?.request_id || data?.request_id;
    } catch {
        return undefined;
    }
}

/// <summary>
/// Procesa la respuesta HTTP y lanza un error descriptivo si no es exitosa.
/// Recibe la respuesta (res) y un mensaje por defecto (defaultMessage). No envía datos adicionales al backend.
/// </summary>
export async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
    if (res.status >= 500) {
        const requestId = await getServerRequestId(res);
        const msg = requestId
            ? `Servicio no disponible, intentelo de nuevo mas tarde. ID soporte: ${requestId}`
            : 'Servicio no disponible, intentelo de nuevo mas tarde.';
        globalThis.dispatchEvent(new CustomEvent('global_api_error', { detail: msg }));
        throw new GlobalApiError(msg, requestId);
    }

    if (!res.ok) {
        const details = await getErrorDetails(res, defaultMessage);
        throw new ApiError(details.message, {
            status: res.status,
            code: details.code,
            requestId: details.requestId,
            fieldErrors: details.fieldErrors,
        });
    }
    if (res.status === 204) return null as T;
    return res.json();
}

/// <summary>
/// Wrapper para la función fetch nativa para manejar automáticamente respuestas 401 y refrescar el token.
/// Recibe la URL (input) y las opciones de petición (init). Envía la petición con las credenciales correspondientes.
/// </summary>
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const safeFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
        try {
            return await fetch(url, options);
        } catch (err) {
            console.error('Fetch connection error:', err);
            const msg = 'No se pudo establecer conexión con el servidor. Inténtelo de nuevo más tarde.';
            globalThis.dispatchEvent(new CustomEvent('global_api_error', { detail: msg }));
            throw new GlobalApiError(msg);
        }
    };

    let requestInit = init;
    if (isAccessTokenExpiredOrNearExpiry()) {
        const access = await refreshAccessToken();
        requestInit = withAuthorization(init, access);
    }

    let res = await safeFetch(input, requestInit);

    if (res.status === 401) {
        if (localStorage.getItem('refresh_token')) {
            const access = await refreshAccessToken();
            const newInit = withAuthorization(requestInit, access);
            res = await safeFetch(input, newInit);
        } else {

            localStorage.removeItem('token');
            globalThis.dispatchEvent(new Event('auth:session-expired'));
        }
    }

    return res;
}
