import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loginRequest,
  refreshTokenRequest,
  logoutRequest,
  getMeRequest,
  changePasswordRequest,
  healthCheckRequest,
} from '../../services/auth.service';

describe('auth.service extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('login usa email y devuelve payload completo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access: 'a', refresh: 'r', user: { id: 1, username: 'u', email: 'e@x.com' }, must_change_password: false }),
    }) as any;

    const result = await loginRequest('e@x.com', 'secret123');
    expect(result.access).toBe('a');
    const [, config] = (globalThis.fetch as any).mock.calls[0];
    expect(JSON.parse(config.body).email).toBe('e@x.com');
  });

  it('refresh falla con mensaje de sesion expirada', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as any;
    await expect(refreshTokenRequest('expired')).rejects.toThrow(/expirada/i);
  });

  it('logout no llama API si no hay refresh token', async () => {
    globalThis.fetch = vi.fn();
    await logoutRequest();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('getMe retorna user con role backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, role: 'admin', email: 'a@a.com', username: 'admin' }) }) as any;
    const user = await getMeRequest();
    expect(user.role).toBe('admin');
  });

  it('changePassword propaga error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ current_password: ['invalid'] }) }) as any;
    await expect(changePasswordRequest({ current_password: 'x', new_password: 'y', new_password_confirm: 'y' })).rejects.toThrow();
  });

  it('healthCheck falla cuando backend no responde', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as any;
    await expect(healthCheckRequest()).rejects.toThrow('Health check failed');
  });
});
