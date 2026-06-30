import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    activateWithEmail,
    createPolicy,
    deactivatePolicy,
    getPolicies,
    getPolicyDocumentUrl,
    sendToInsurer,
    updatePolicy,
    uploadPolicyDocument,
} from '../../services/policies.service';

describe('Policies Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getPolicies retorna lista desde respuesta paginada', async () => {
        const mockData = [{ id: 1, policy_number: 'POL-001' }];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ count: 1, next: null, previous: null, results: mockData }),
        }) as any;

        const result = await getPolicies();

        expect(result).toEqual(mockData);
    });

    it('createPolicy usa endpoint create con POST', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ id: 1, policy_number: 'POL-001' }),
        }) as any;

        await createPolicy({ policy_number: 'POL-001', vehicles: [] } as any);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/create/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('uploadPolicyDocument usa endpoint document con FormData sin Content-Type manual', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1, policy_number: 'POL-001' }),
        }) as any;

        const file = new File(['pdf'], 'poliza.pdf', { type: 'application/pdf' });
        await uploadPolicyDocument(1, file);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/document/'),
            expect.objectContaining({
                method: 'PATCH',
                body: expect.any(FormData),
            }),
        );
        const [, init] = (globalThis.fetch as any).mock.calls[0];
        expect(init.headers).not.toHaveProperty('Content-Type');
    });

    it('getPolicyDocumentUrl retorna URL temporal del documento', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ url: 'https://example.com/policy.pdf' }),
        }) as any;

        const result = await getPolicyDocumentUrl(1);

        expect(result).toBe('https://example.com/policy.pdf');
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/document/url/'),
            expect.any(Object),
        );
    });

    it('updatePolicy usa endpoint update con PUT', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1, policy_number: 'POL-001' }),
        }) as any;

        await updatePolicy(1, { policy_number: 'POL-001', vehicles: [] } as any);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/update/'),
            expect.objectContaining({ method: 'PUT' }),
        );
    });

    it('deactivatePolicy usa deactivate con PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1, is_active: false }),
        }) as any;

        await deactivatePolicy(1);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/deactivate/'),
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    it('sendToInsurer usa endpoint de envio con POST', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1, status: 'sent_to_insurer' }),
        }) as any;

        await sendToInsurer(1);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/send-to-insurer/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('activateWithEmail usa endpoint de activacion con email', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 1, status: 'active' }),
        }) as any;

        await activateWithEmail(1);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/policies/management/1/activate-with-email/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
