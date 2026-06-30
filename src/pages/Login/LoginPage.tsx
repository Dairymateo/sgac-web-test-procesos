/// <summary>
/// Componente LoginPage.tsx
/// </summary>
import './LoginPage.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegCircleUser } from 'react-icons/fa6';
import { FiEye, FiEyeOff, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo-removebg-preview.png';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(false);
        setLoading(true);

        try {
            await login(email, contrasena);
            navigate('/dashboard');
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg login-bg">
            <div className="auth-shell login-shell">
                <section className="auth-brand-panel login-brand-panel" aria-hidden="true">
                    <div className="auth-brand-mark login-brand-mark">
                        <img src={logo} alt="" className="auth-brand-logo login-brand-logo" />
                    </div>
                    <h2 className="auth-brand-heading login-brand-heading">HerreSeguros</h2>
                    <p className="auth-brand-subtitle login-brand-subtitle">Broker de Seguros</p>
                    <div className="auth-brand-divider login-brand-divider" />
                    <p className="auth-brand-copy login-brand-copy">
                        Plataforma interna para la gestion de clientes, vehiculos, siniestros y cotizaciones.
                    </p>
                </section>

                <section className="auth-card login-card">
                    <div className="login-user-icon" aria-hidden="true">
                        <FaRegCircleUser />
                    </div>

                    <h1 className="login-title">Iniciar sesión</h1>
                    <p className="login-subtitle">Ingrese sus credenciales para continuar</p>
                    <div className="login-security-note">
                        <FiShield aria-hidden="true" />
                        <span>Acceso interno seguro</span>
                    </div>

                    <form className="auth-form login-form" onSubmit={handleLogin}>
                        <div className="auth-field login-field">
                            <label htmlFor="usuario" className="login-field-label">
                                <FiMail aria-hidden="true" />
                                <span>Email</span>
                            </label>
                            <input
                                id="usuario"
                                type="email"
                                placeholder="Ingrese su email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(false); }}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                disabled={loading}
                            />
                        </div>

                        <div className="auth-field login-field">
                            <label htmlFor="contrasena" className="login-field-label">
                                <FiLock aria-hidden="true" />
                                <span>Contraseña</span>
                            </label>
                            <div className="login-input-wrap">
                                <input
                                    id="contrasena"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ingrese su contraseña"
                                    value={contrasena}
                                    onChange={e => { setContrasena(e.target.value); setError(false); }}
                                    autoComplete="current-password"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <FiEyeOff />
                                    ) : (
                                        <FiEye />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-error login-error" role="alert">
                                Usuario o contraseña incorrectos. Verifique sus credenciales.
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-btn"
                            aria-label={loading ? 'Verificando...' : 'Iniciar sesión'}
                            disabled={loading}
                        >
                            {loading ? 'Verificando...' : 'Ingresar'}
                        </button>
                        <p className="login-legal-note">Uso exclusivo del personal autorizado.</p>
                    </form>
                </section>
            </div>

        </div>
    );
}