import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginRequest, logoutRequest, getMeRequest, refreshTokenRequest, changePasswordRequest, healthCheckRequest } from '../../services/auth.service';

describe('Auth Service', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('loginRequest llama endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access: 'a', refresh: 'r', user: { id: 1 }, must_change_password: false }) }) as any;
    const result = await loginRequest('user@test.com', 'pass');
    expect(result.access).toBe('a');
  });

  it('getMeRequest lanza error si no ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }) as any;
    await expect(getMeRequest()).rejects.toThrow();
  });

  it('logoutRequest llama logout si hay refresh', async () => {
    localStorage.setItem('refresh_token', 'fake-refresh');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ detail: 'ok' }) }) as any;
    await logoutRequest();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout/'), expect.objectContaining({ method: 'POST' }));
  });

  it('refreshTokenRequest funciona', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access: 'new-token' }) }) as any;
    const result = await refreshTokenRequest('old-refresh');
    expect(result.access).toBe('new-token');
  });

  it('changePasswordRequest llama endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ detail: 'ok' }) }) as any;
    await changePasswordRequest({ current_password: '1', new_password: '2', new_password_confirm: '2' });
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/change-password/'), expect.objectContaining({ method: 'POST' }));
  });

  it('healthCheckRequest llama endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }) as any;
    await healthCheckRequest();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/health/'), expect.objectContaining({ method: 'GET' }));
  });
});
