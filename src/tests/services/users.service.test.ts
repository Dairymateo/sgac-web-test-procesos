import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsers, createUser, updateUser, deactivateUser, adminResetPassword, registerUser } from '../../services/users.service';

describe('Users Service', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('getUsers retorna lista', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1, username: 'user1' }] }) as any;
    const result = await getUsers();
    expect(result[0].id).toBe(1);
  });

  it('createUser maneja errores json', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ username: ['Ya existe'] }) }) as any;
    await expect(createUser({} as any)).rejects.toThrow(/username/i);
  });

  it('updateUser usa PUT endpoint actual', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) }) as any;
    await updateUser(1, { email: 'test@test.com' } as any);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/users/management/1/update/');
  });

  it('deactivateUser llama a /deactivate/', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, is_active: false }) }) as any;
    await deactivateUser(1);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/users/management/1/deactivate/');
  });

  it('adminResetPassword endpoint correcto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ detail: 'ok' }) }) as any;
    await adminResetPassword(1, { new_password: 'newPassword123' });
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/reset-password/');
  });

  it('registerUser usa create', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1 }) }) as any;
    await registerUser({} as any);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/users/management/create/');
  });
});
