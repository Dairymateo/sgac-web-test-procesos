/// <summary>
/// Componente Router.test.tsx
/// </summary>
import { describe, it, expect, vi } from 'vitest';
import router from '../../router/index';

vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../pages/Login/LoginPage', () => ({ default: () => null }));
vi.mock('../../pages/Dashboard/DashboardPage', () => ({ default: () => null }));
vi.mock('../../components/layout/DashboardLayout', () => ({ default: () => null }));
vi.mock('../../pages/Users/UsersPage', () => ({ default: () => null }));
vi.mock('../../pages/Configuracion/ConfiguracionPage', () => ({ default: () => null }));
vi.mock('../../pages/Policies/PoliciesPage', () => ({ default: () => null }));

describe('Router', () => {
    it('router object is defined', () => {
        expect(router).toBeDefined();
    });
});