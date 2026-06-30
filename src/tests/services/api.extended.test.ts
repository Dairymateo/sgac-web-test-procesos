import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    ApiError,
    GlobalApiError,
    authHeaders,
    authHeadersMultipart,
    handleResponse,
    apiFetch,
    isAccessTokenExpiredOrNearExpiry,
} from '../../services/api';

describe('API Utility - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('authHeaders', () => {
        it('incluye Authorization cuando hay token', () => {
            localStorage.setItem('token', 'my-token');
            const headers = authHeaders();
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                Authorization: 'Bearer my-token',
            });
        });

        it('no incluye Authorization cuando no hay token', () => {
            const headers = authHeaders();
            expect(headers).toEqual({ 'Content-Type': 'application/json' });
            expect((headers as any).Authorization).toBeUndefined();
        });
    });

    describe('authHeadersMultipart', () => {
        it('retorna solo Authorization cuando hay token', () => {
            localStorage.setItem('token', 'my-token');
            const headers = authHeadersMultipart();
            expect(headers).toEqual({ Authorization: 'Bearer my-token' });
        });

        it('retorna objeto vacío cuando no hay token', () => {
            const headers = authHeadersMultipart();
            expect(headers).toEqual({});
        });
    });

    describe('handleResponse', () => {
        it('retorna JSON cuando la respuesta es exitosa', async () => {
            const mockRes = {
                ok: true, status: 200,
                json: async () => ({ data: 'test' })
            } as Response;
            const result = await handleResponse(mockRes, 'Error');
            expect(result).toEqual({ data: 'test' });
        });

        it('retorna null cuando el status es 204', async () => {
            const mockRes = { ok: true, status: 204 } as Response;
            const result = await handleResponse(mockRes, 'Error');
            expect(result).toBeNull();
        });

        it('lanza error con mensaje JSON descriptivo', async () => {
            const mockRes = {
                ok: false, status: 400,
                text: async () => JSON.stringify({ email: ['invalid'], name: ['required'] })
            } as Response;
            await expect(handleResponse(mockRes, 'Default')).rejects.toThrow('email: invalid; name: required');
        });

        it('lanza GlobalApiError cuando status >= 500', async () => {
            const mockRes = {
                ok: false, status: 500,
                headers: new Headers({ 'x-request-id': 'req-500' }),
                clone: () => ({ text: async () => '' }),
                text: async () => ''
            } as Response;
            await expect(handleResponse(mockRes, 'Default')).rejects.toMatchObject({
                name: 'GlobalApiError',
                requestId: 'req-500',
                message: 'Servicio no disponible, intentelo de nuevo mas tarde. ID soporte: req-500',
            } satisfies Partial<GlobalApiError>);
        });

        it('lanza GlobalApiError genérico incluso si HTML no tiene marcadores conocidos (502)', async () => {
            const mockRes = {
                ok: false, status: 502,
                headers: new Headers(),
                clone: () => ({ text: async () => '<html><body>Bad Gateway</body></html>' }),
                text: async () => '<html><body>Bad Gateway</body></html>'
            } as Response;
            await expect(handleResponse(mockRes, 'Default')).rejects.toThrow('Servicio no disponible, intentelo de nuevo mas tarde.');
        });

        it('lanza GlobalApiError sin intentar leer text() si status >= 500', async () => {
            const mockRes = {
                ok: false, status: 500,
                headers: new Headers(),
                clone: () => ({ text: async () => { throw new Error('stream error'); } }),
                text: async () => { throw new Error('stream error'); }
            } as unknown as Response;
            await expect(handleResponse(mockRes, 'Fallback msg')).rejects.toThrow('Servicio no disponible, intentelo de nuevo mas tarde.');
        });

        it('maneja respuesta JSON array', async () => {
            const mockRes = {
                ok: false, status: 400,
                text: async () => JSON.stringify(['error1', 'error2'])
            } as Response;
            await expect(handleResponse(mockRes, 'Default')).rejects.toThrow('error1, error2');
        });

        it('expone fields y request_id de errores de validacion del backend', async () => {
            const mockRes = {
                ok: false,
                status: 400,
                text: async () => JSON.stringify({
                    error: {
                        code: 'validation_error',
                        message: 'Invalid data.',
                        request_id: 'f855e9bd-c913-483f-815b-f1abc29b94a4',
                        fields: {
                            document_number: ['document_number must be a valid Ecuadorian cedula.'],
                        },
                        field_errors: {
                            birth_date: [{ message: 'Customer must be at least 18 years old.', code: 'invalid' }],
                        },
                    },
                }),
            } as Response;

            await expect(handleResponse(mockRes, 'Default')).rejects.toMatchObject({
                name: 'ApiError',
                status: 400,
                code: 'validation_error',
                requestId: 'f855e9bd-c913-483f-815b-f1abc29b94a4',
                fieldErrors: {
                    document_number: 'document_number must be a valid Ecuadorian cedula.',
                    birth_date: 'Customer must be at least 18 years old.',
                },
            } satisfies Partial<ApiError>);
        });

        it('expone codigo conflict y request_id cuando el backend responde 409', async () => {
            const mockRes = {
                ok: false,
                status: 409,
                clone: () => ({
                    text: async () => JSON.stringify({
                        error: {
                            code: 'conflict',
                            message: 'Customer cannot be deleted because it has related records.',
                            request_id: 'req-conflict',
                        },
                    }),
                }),
                text: async () => JSON.stringify({
                    error: {
                        code: 'conflict',
                        message: 'Customer cannot be deleted because it has related records.',
                        request_id: 'req-conflict',
                    },
                }),
            } as Response;

            await expect(handleResponse(mockRes, 'Default')).rejects.toMatchObject({
                name: 'ApiError',
                status: 409,
                code: 'conflict',
                requestId: 'req-conflict',
            } satisfies Partial<ApiError>);
        });
    });

    describe('apiFetch - token refresh con nuevo refresh token', () => {
        it('guarda el nuevo refresh_token si viene en la respuesta', async () => {
            localStorage.setItem('refresh_token', 'old-refresh');
            globalThis.fetch = vi.fn()
                .mockResolvedValueOnce({ status: 401, ok: false })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access: 'new-access', refresh: 'new-refresh' })
                })
                .mockResolvedValueOnce({ status: 200, ok: true });

            await apiFetch('/test');
            expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
        });

        it('detecta access token proximo a expirar', () => {
            const exp = Math.floor(Date.now() / 1000) + 30;
            const payload = btoa(JSON.stringify({ exp }));
            localStorage.setItem('token', `h.${payload}.s`);

            expect(isAccessTokenExpiredOrNearExpiry()).toBe(true);
        });

        it('refresca proactivamente antes del request cuando faltan menos de 60 segundos', async () => {
            const exp = Math.floor(Date.now() / 1000) + 30;
            const payload = btoa(JSON.stringify({ exp }));
            localStorage.setItem('token', `h.${payload}.s`);
            localStorage.setItem('refresh_token', 'old-refresh');

            globalThis.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access: 'fresh-access' }),
                })
                .mockResolvedValueOnce({ status: 200, ok: true });

            await apiFetch('/customers/management/create/', {
                method: 'POST',
                headers: authHeadersMultipart(),
                body: new FormData(),
            });

            expect(globalThis.fetch).toHaveBeenCalledTimes(2);
            const [, createConfig] = (globalThis.fetch as any).mock.calls[1];
            expect(createConfig.headers.get('Authorization')).toBe('Bearer fresh-access');
            expect(createConfig.headers.has('Content-Type')).toBe(false);
        });
    });
});
