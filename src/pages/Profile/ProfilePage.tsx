/// <summary>
/// Componente ProfilePage.tsx
/// </summary>
import './ProfilePage.css';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiEdit2, FiLock, FiSave } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import type { RoleEnum } from '../../types/user';
import { partialUpdateUser } from '../../services/users.service';
import { getSaveButtonLabel, isFormDirty } from '../../utils/form-state';

const ROLE_LABELS: Record<RoleEnum, string> = {
    admin: 'Administrador',
    quote_technician: 'Técnico de Cotizaciones',
    sales_representative: 'Vendedor Comercial',
    administrative_staff: 'Personal Administrativo',
};

function formatRole(role?: RoleEnum): string {
    return role ? ROLE_LABELS[role] : 'Usuario';
}

function formatStatus(isActive?: boolean): string {
    if (isActive === false) return 'Inactivo';
    return 'Activo';
}

interface ProfileFormState {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

function mapUserToProfileForm(user: ReturnType<typeof useAuth>['currentUser']): ProfileFormState {
    return {
        username: user?.username || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
    };
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { currentUser, reloadCurrentUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [form, setForm] = useState<ProfileFormState>(() => mapUserToProfileForm(currentUser));

    useEffect(() => {
        setForm(mapUserToProfileForm(currentUser));
        setError(null);
        setSuccess(null);
    }, [currentUser]);

    const initialForm = mapUserToProfileForm(currentUser);
    const hasChanges = isFormDirty(form, initialForm);
    const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || currentUser?.username || 'Usuario';
    const firstNameDisplay = currentUser?.first_name || displayName;

    const updateField = (field: keyof ProfileFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(null);
    };

    const cancelEdit = () => {
        setForm(initialForm);
        setIsEditing(false);
        setError(null);
        setSuccess(null);
    };

    const saveProfile = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!currentUser?.id || !hasChanges) return;

        if (!form.username.trim() || !form.email.trim()) {
            setError('Usuario y email son obligatorios.');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await partialUpdateUser(currentUser.id, {
                username: form.username.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
            });
            await reloadCurrentUser();
            setIsEditing(false);
            setSuccess('Perfil actualizado correctamente.');
        } catch (err: any) {
            if (err?.isGlobal) return;
            setError(err?.message || 'No se pudo actualizar el perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="profile-page">
            <section className="profile-card">
                <div className="profile-hero">
                    <div className="profile-avatar" aria-hidden="true">
                        <FiClipboard />
                    </div>
                    <div>
                        <h1>Mi perfil</h1>
                        <p>Consulta la información principal de tu cuenta y administra tu acceso.</p>
                    </div>
                </div>

                <form className="profile-content" onSubmit={saveProfile}>
                    {error && <div className="action-error profile-message" role="alert">{error}</div>}
                    {success && <output className="auth-success profile-message">{success}</output>}

                    <div className="profile-grid">
                        <div className="profile-field">
                            <span>Nombre</span>
                            {isEditing ? (
                                <input
                                    value={form.first_name}
                                    onChange={(event) => updateField('first_name', event.target.value)}
                                    placeholder="Nombre"
                                />
                            ) : (
                                <strong>{firstNameDisplay}</strong>
                            )}
                        </div>
                        <div className="profile-field">
                            <span>Apellido</span>
                            {isEditing ? (
                                <input
                                    value={form.last_name}
                                    onChange={(event) => updateField('last_name', event.target.value)}
                                    placeholder="Apellido"
                                />
                            ) : (
                                <strong>{currentUser?.last_name || '-'}</strong>
                            )}
                        </div>
                        <div className="profile-field">
                            <span>Usuario</span>
                            {isEditing ? (
                                <input
                                    value={form.username}
                                    onChange={(event) => updateField('username', event.target.value)}
                                    placeholder="Usuario"
                                    required
                                />
                            ) : (
                                <strong>{currentUser?.username || 'Usuario'}</strong>
                            )}
                        </div>
                        <div className="profile-field">
                            <span>Email</span>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => updateField('email', event.target.value)}
                                    placeholder="correo@dominio.com"
                                    required
                                />
                            ) : (
                                <strong>{currentUser?.email || 'Sin email registrado'}</strong>
                            )}
                        </div>
                        <div className="profile-field">
                            <span>Rol</span>
                            <strong>{formatRole(currentUser?.role)}</strong>
                        </div>
                        <div className="profile-field">
                            <span>Estado</span>
                            <strong>{formatStatus(currentUser?.is_active)}</strong>
                        </div>
                        <div className="profile-field">
                            <span>Seguridad</span>
                            <strong>{currentUser?.must_change_password ? 'Cambio requerido' : 'Credenciales vigentes'}</strong>
                        </div>
                    </div>

                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={isSaving}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSaving || !hasChanges}>
                                    <FiSave aria-hidden="true" />
                                    {getSaveButtonLabel(isSaving, true)}
                                </button>
                            </>
                        ) : (
                            <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>
                                <FiEdit2 aria-hidden="true" />
                                Editar perfil
                            </button>
                        )}
                        <button type="button" className="btn-primary" onClick={() => navigate('/change-password')}>
                            <FiLock aria-hidden="true" />
                            Cambiar contraseña
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}