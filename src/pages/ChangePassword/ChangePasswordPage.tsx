/// <summary>
/// Componente ChangePasswordPage.tsx
/// </summary>
import './ChangePasswordPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { changePasswordRequest } from '../../services/auth.service';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import logo from '../../assets/logo-removebg-preview.png';

export default function ChangePasswordPage() {
    const navigate = useNavigate();
    const { currentUser, logout, reloadCurrentUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

    const mustChangePassword = !!currentUser?.must_change_password;

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== newPasswordConfirm) {
            setError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        setIsSaving(true);
        try {
            await changePasswordRequest({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirm: newPasswordConfirm,
            });

            await reloadCurrentUser();
            setSuccess('Contraseña actualizada correctamente. Redirigiendo...');
            setTimeout(() => navigate('/dashboard', { replace: true }), 800);
        } catch (err: any) {
            if (err?.isGlobal) return;
            setError(err?.message || 'No se pudo cambiar la contraseña.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <div className="auth-bg change-password-page">
            <div className="auth-shell change-password-shell">
                <section className="auth-brand-panel change-password-brand-panel" aria-hidden="true">
                    <div className="auth-brand-mark change-password-brand-mark">
                        <img src={logo} alt="" className="auth-brand-logo" />
                    </div>
                    <h2 className="auth-brand-heading">HerreSeguros</h2>
                    <p className="auth-brand-subtitle">Broker de Seguros</p>
                    <div className="auth-brand-divider" />
                    <p className="auth-brand-copy">
                        {mustChangePassword
                            ? 'Cambio de contraseña obligatorio para mantener la seguridad de su cuenta.'
                            : 'Actualiza tu contraseña cuando lo necesites desde tu cuenta.'}
                    </p>
                </section>

                <section className="auth-card change-password-card">
                    <h1>{mustChangePassword ? 'Cambio obligatorio de contraseña' : 'Cambiar contraseña'}</h1>
                    <p>
                        {mustChangePassword
                            ? 'Por seguridad, debes actualizar tu contraseña antes de continuar.'
                            : 'Ingresa tu contraseña actual y define una nueva para actualizar tu acceso.'}
                    </p>

                    <form onSubmit={handleSubmit} className="auth-form change-password-form">
                        <div className="auth-field">
                            <label htmlFor="current_password">Contraseña actual</label>
                            <div className="change-password-input-wrap">
                                <input
                                    id="current_password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="change-password-eye-btn"
                                    onClick={() => setShowCurrentPassword(v => !v)}
                                    aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="new_password">Nueva contraseña</label>
                            <div className="change-password-input-wrap">
                                <input
                                    id="new_password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    className="change-password-eye-btn"
                                    onClick={() => setShowNewPassword(v => !v)}
                                    aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="new_password_confirm">Confirmar nueva contraseña</label>
                            <div className="change-password-input-wrap">
                                <input
                                    id="new_password_confirm"
                                    type={showNewPasswordConfirm ? 'text' : 'password'}
                                    value={newPasswordConfirm}
                                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    className="change-password-eye-btn"
                                    onClick={() => setShowNewPasswordConfirm(v => !v)}
                                    aria-label={showNewPasswordConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showNewPasswordConfirm ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {error && <div className="auth-error change-password-error" role="alert">{error}</div>}
                        {success && <output className="auth-success change-password-success">{success}</output>}

                        <div className="change-password-actions">
                            {mustChangePassword ? (
                                <button type="button" className="btn-secondary" onClick={handleLogout}>
                                    Cerrar sesión
                                </button>
                            ) : (
                                <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/perfil')}>
                                    Volver al perfil
                                </button>
                            )}
                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Actualizar contraseña'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}