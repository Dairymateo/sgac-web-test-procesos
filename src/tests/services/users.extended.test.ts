import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, getUser, getUsers, partialUpdateUser, deactivateUser } from '../../services/users.service';

describe('users.service extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getUser usa endpoint management actual', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 5, username: 'ana' }) }) as any;
    await getUser(5);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/users/management/5/');
  });

  it('partialUpdate usa /partial-update/', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, email: 'new@test.com' }) }) as any;
    await partialUpdateUser(1, { email: 'new@test.com' });
    const [url, config] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toContain('/users/management/1/partial-update/');
    expect(config.method).toBe('PATCH');
  });



  it('createUser maneja error DRF', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ email: ['already exists'] }) }) as any;
    await expect(createUser({} as any)).rejects.toThrow('email: already exists');
  });

  it('getUsers incluye bearer token', async () => {
    localStorage.setItem('token', 'user-token');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }) as any;
    await getUsers();
    const [, config] = (globalThis.fetch as any).mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer user-token');
  });

  it('deactivateUser usa /deactivate/ con PATCH', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 3, is_active: false }) }) as any;
    await deactivateUser(3);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/users/management/3/deactivate/');
    expect((globalThis.fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
