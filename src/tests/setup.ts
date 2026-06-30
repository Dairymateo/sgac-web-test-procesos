import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

type FetchLikeResponse = {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
};

const DEFAULT_ME_USER = {
    id: 1,
    username: 'test-user',
    email: 'test@sgac.local',
    role: 'admin',
    is_active: true,
};

const buildJsonResponse = (data: unknown, status = 200): FetchLikeResponse => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
});

const getUrl = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input.url;
};

let errorSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
    if (!vi.isMockFunction(globalThis.fetch)) {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: RequestInfo | URL) => {
                const url = getUrl(input);

                if (url.includes('/auth/me/')) {
                    return buildJsonResponse(DEFAULT_ME_USER) as unknown as Response;
                }

                if (url.includes('/insurers/management/')) {
                    return buildJsonResponse([]) as unknown as Response;
                }

                return buildJsonResponse({}) as unknown as Response;
            }),
        );
    }

    errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';

        if (firstArg.includes('Failed to load user')) return;
        if (firstArg.includes('Cross-Origin Request Blocked')) return;
        if (firstArg.includes('not wrapped in act')) return;

        console.warn(...args);
    });
});

afterEach(() => {
    if (errorSpy) {
        errorSpy.mockRestore();
        errorSpy = null;
    }
});
