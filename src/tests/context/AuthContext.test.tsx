/// <summary>
/// Componente AuthContext.test.tsx
/// </summary>
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../context/AuthContext';

function Consumer() {
  const { isAuthenticated, token, currentUser, isLoading } = useAuth();
  return <>
    <span data-testid='auth'>{String(isAuthenticated)}</span>
    <span data-testid='token'>{token || 'null'}</span>
    <span data-testid='user'>{currentUser?.username || 'none'}</span>
    <span data-testid='role'>{currentUser?.role || 'none'}</span>
    <span data-testid='loading'>{String(isLoading)}</span>
  </>;
}

describe('AuthContext', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('no autenticado cuando no hay token', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('fallback JWT si /me falla por error de red', async () => {
    const payload = btoa(JSON.stringify({ username: 'admin', email: 'admin@test.com', role: 'admin' }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network')) as any;

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('auth').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('admin');
  });

  it('evento session-expired desautentica', async () => {
    const payload = btoa(JSON.stringify({ username: 'x', role: 'admin' }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network')) as any;

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));

    act(() => { globalThis.dispatchEvent(new Event('auth:session-expired')); });
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
  });
});