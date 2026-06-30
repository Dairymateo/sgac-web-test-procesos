/// <summary>
/// Componente AuthContext.tsx
/// </summary>
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
    type ReactNode,
} from 'react';
import { loginRequest, logoutRequest, getMeRequest } from '../services/auth.service';
import type { User } from '../types/user';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    currentUser: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    reloadCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('token')
    );
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = useCallback(async () => {
        if (!token) {
            setCurrentUser(null);
            setIsLoading(false);
            return;
        }
        try {
            const user = await getMeRequest();
            setCurrentUser(user);
        } catch (error) {
            console.error('Failed to load user', error);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUser({
                    id: payload.user_id || 0,
                    username: payload.username || payload.email || '',
                    email: payload.email || '',
                    role: payload.role || 'admin',
                    is_staff: !!payload.is_staff,
                    is_superuser: !!payload.is_superuser,
                    must_change_password: !!payload.must_change_password,
                } as User);
            } catch (e) {
                console.error('Failed to parse token payload fallback', e);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        const handleTokenRefreshed = (e: Event) => {
            const newToken = (e as CustomEvent).detail?.token;
            if (newToken) {
                setToken(newToken);
            }
        };

        const handleSessionExpired = () => {
            setToken(null);
            setCurrentUser(null);
        };

        globalThis.addEventListener('auth:token-refreshed', handleTokenRefreshed);
        globalThis.addEventListener('auth:session-expired', handleSessionExpired);

        return () => {
            globalThis.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
            globalThis.removeEventListener('auth:session-expired', handleSessionExpired);
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await loginRequest(email, password);
        localStorage.setItem('token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        setCurrentUser(data.user);
        setToken(data.access);
    }, []);

    const logout = useCallback(async () => {
        await logoutRequest();
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setCurrentUser(null);
    }, []);

    const reloadCurrentUser = useCallback(async () => {
        if (!token) return;
        const user = await getMeRequest();
        setCurrentUser(user);
    }, [token]);

    const contextValue = useMemo(
        () => ({
            isAuthenticated: !!token,
            token,
            currentUser,
            isLoading,
            login,
            logout,
            reloadCurrentUser,
        }),
        [token, currentUser, isLoading, login, logout, reloadCurrentUser]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', height: '100vh', alignItems: 'center' }}>
                    Cargando sesión...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}