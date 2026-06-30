/// <summary>
/// Componente UserFormModal.tsx
/// </summary>
import './UserFormModal.css';
import { useState, useEffect } from 'react';
import type { SubmitEvent } from 'react';
import type { User, RoleEnum } from '../../../types/user';
import { FieldError } from '../../../components/common/FieldError';
import ModalCloseButton from '../../../components/common/ModalCloseButton';
import { getSaveButtonLabel, isFormDirty } from '../../../utils/form-state';

export interface FormUsuario {
    id?: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: RoleEnum;
    is_active: boolean;
    password?: string;
}

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: FormUsuario) => Promise<void>;
    editingUser?: User | null;
}

const ROLES: { value: RoleEnum; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'quote_technician', label: 'Tecnico de Cotizaciones' },
    { value: 'sales_representative', label: 'Vendedor Comercial' },
    { value: 'administrative_staff', label: 'Personal Administrativo' },
];

const EMPTY_FORM: FormUsuario = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'quote_technician',
    is_active: true,
    password: '',
};

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]{1,256}@[a-zA-Z0-9.-]{1,256}\.[a-zA-Z]{2,64}$/;
const NAME_PATTERN = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;

const FIELD_LABELS: Record<string, string> = {
    username: 'nombre de usuario',
    first_name: 'nombres',
    last_name: 'apellidos',
    email: 'correo electrónico',
    password: 'contraseña',
    role: 'rol',
    is_active: 'estado',
};

function mapUserToForm(user: User): FormUsuario {
    return {
        username: user.username,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
        role: user.role || 'quote_technician',
        is_active: user.is_active ?? true,
        password: '',
    };
}

function translateUserFieldError(field: string, message: string): string {
    const normalized = message.trim();
    const lower = normalized.toLowerCase();

    if (lower.includes('enter a valid email address')) return 'Ingrese un correo electrónico válido.';
    if (lower.includes('this field is required') || lower.includes('this field may not be blank')) {
        return 'Este campo es obligatorio.';
    }
    if (lower.includes('ensure this field has at least 8 characters')) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (lower.includes('the password is too similar to the first name')) {
        return 'La contraseña es muy similar al nombre.';
    }
    if (lower.includes('a user with that username already exists')) {
        return 'Ya existe un usuario con ese nombre de usuario.';
    }
    if (lower.includes('user with this email already exists') || lower.includes('email already exists')) {
        return 'Ya existe un usuario con ese correo electrónico.';
    }
    if (lower.includes('not a valid choice')) {
        return 'Seleccione un valor válido.';
    }

    const label = FIELD_LABELS[field];
    return label ? `Revise el campo ${label}.` : normalized;
}

function parseApiFieldErrors(errorMessage: string): Record<string, string> {
    const errors: Record<string, string> = {};
    const splitErrors = errorMessage.split(';').map((item) => item.trim()).filter(Boolean);

    for (const item of splitErrors) {
        const separatorIndex = item.indexOf(':');
        if (separatorIndex < 0) continue;
        const field = item.slice(0, separatorIndex).trim();
        const message = item.slice(separatorIndex + 1).trim();

        if (field && message) {
            const isGenericKey = ['detail', 'non_field_errors', 'error', 'message'].includes(field);
            const hasSpace = field.includes(' ');
            if (!isGenericKey && !hasSpace) {
                errors[field] = translateUserFieldError(field, message);
            }
        }
    }

    return errors;
}

function normalizeApiFieldErrors(fieldErrors?: Record<string, string>): Record<string, string> {
    if (!fieldErrors) return {};

    return Object.entries(fieldErrors).reduce<Record<string, string>>((acc, [field, message]) => {
        if (message) acc[field] = translateUserFieldError(field, message);
        return acc;
    }, {});
}

function validateUserForm(form: FormUsuario, isEditing: boolean): Record<string, string> {
    const errors: Record<string, string> = {};
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password?.trim() ?? '';

    if (isEditing && !username) errors.username = 'Ingrese un nombre de usuario.';
    if (!email) errors.email = 'Ingrese un correo electrónico.';
    else if (!EMAIL_PATTERN.test(email)) errors.email = 'Ingrese un correo electrónico válido.';

    if (!form.first_name.trim()) {
        errors.first_name = 'Ingrese el nombre.';
    } else if (!NAME_PATTERN.test(form.first_name)) {
        errors.first_name = 'Use solo letras y espacios.';
    }
    if (!form.last_name.trim()) {
        errors.last_name = 'Ingrese los apellidos.';
    } else if (!NAME_PATTERN.test(form.last_name)) {
        errors.last_name = 'Use solo letras y espacios.';
    }
    if (!ROLES.some(role => role.value === form.role)) {
        errors.role = 'Seleccione un rol válido.';
    }
    if (!isEditing) {
        if (!password) errors.password = 'Ingrese una contraseña temporal.';
        else if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    return errors;
}

export default function UserFormModal({
    isOpen,
    onClose,
    onSave,
    editingUser,
}: Readonly<UserFormModalProps>) {
    const [form, setForm] = useState<FormUsuario>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingUser) {
            setForm(mapUserToForm(editingUser));
        } else {
            setForm(EMPTY_FORM);
        }
        setShowPassword(false);
        setFieldErrors({});
        setError(null);
    }, [editingUser, isOpen]);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFieldErrors({});
        setError(null);

        const normalizedForm: FormUsuario = {
            ...form,
            username: form.username.trim(),
            first_name: form.first_name.trim().toUpperCase(),
            last_name: form.last_name.trim().toUpperCase(),
            email: form.email.trim(),
            password: form.password?.trim(),
        };
        const validationErrors = validateUserForm(normalizedForm, Boolean(editingUser));
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            setError('Revisa los campos marcados antes de guardar.');
            return;
        }

        setIsSaving(true);

        try {
            await onSave(editingUser ? { ...normalizedForm, id: editingUser.id } : normalizedForm);
        } catch (err: any) {
            if (err?.isGlobal) return;
            const rawMessage = err?.message || 'Error al guardar usuario.';
            const apiFieldErrors = {
                ...parseApiFieldErrors(rawMessage),
                ...normalizeApiFieldErrors(err?.fieldErrors),
            };
            if (Object.keys(apiFieldErrors).length > 0) {
                setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
                setError('Revisa los campos marcados antes de guardar.');
            } else {
                setError(rawMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const initialForm = editingUser ? mapUserToForm(editingUser) : null;
    const hasChanges = !editingUser || (initialForm ? isFormDirty(form, initialForm) : true);
    const submitLabel = getSaveButtonLabel(isSaving, Boolean(editingUser));

    return (
        <div className="modal-overlay">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal (fondo)"
                tabIndex={-1}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'default',
                }}
            />
            <dialog
                className="modal-box"
                aria-labelledby="modal-title"
                open
                style={{ position: 'relative', zIndex: 1 }}
            >
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">
                        {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                    </h2>
                    <ModalCloseButton onClick={onClose} />
                </div>

                {error && <div className="action-error">{error}</div>}

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label htmlFor="m-username">Nombre de usuario{editingUser ? ' *' : ''}</label>
                            {!editingUser && <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12 }}>(Opcional)</span>}
                        </div>
                        <input
                            id="m-username"
                            type="text"
                            placeholder="Ej: jdoe123"
                            style={{ textTransform: 'none' }}
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        />
                        <FieldError name="username" errors={fieldErrors} />
                    </div>

                    <div className="modal-field">
                        <label htmlFor="m-firstname">Nombre(s) *</label>
                        <input
                            id="m-firstname"
                            type="text"
                            required
                            placeholder="Ej: John"
                            value={form.first_name}
                            onChange={e => {
                                const val = e.target.value;
                                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val)) {
                                    setForm(f => ({ ...f, first_name: val }));
                                }
                            }}
                        />
                        <FieldError name="first_name" errors={fieldErrors} />
                    </div>

                    <div className="modal-field">
                        <label htmlFor="m-lastname">Apellidos *</label>
                        <input
                            id="m-lastname"
                            type="text"
                            required
                            placeholder="Ej: Doe"
                            value={form.last_name}
                            onChange={e => {
                                const val = e.target.value;
                                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val)) {
                                    setForm(f => ({ ...f, last_name: val }));
                                }
                            }}
                        />
                        <FieldError name="last_name" errors={fieldErrors} />
                    </div>

                    <div className="modal-field">
                        <label htmlFor="m-email">Email *</label>
                        <input
                            id="m-email"
                            type="email"
                            required
                            placeholder="usuario@sgac.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        />
                        <FieldError name="email" errors={fieldErrors} />
                    </div>

                    {!editingUser && (
                        <div className="modal-field">
                            <label htmlFor="m-password">Contraseña temporal *</label>
                            <div className="modal-input-wrap">
                                <input
                                    id="m-password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    placeholder="Minimo 8 caracteres"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    className="modal-eye-btn"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <FieldError name="password" errors={fieldErrors} />
                        </div>
                    )}

                    <div className="modal-field">
                        <label htmlFor="m-rol">Rol</label>
                        <select
                            id="m-rol"
                            value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value as RoleEnum }))}
                        >
                            {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                        <FieldError name="role" errors={fieldErrors} />
                    </div>

                    <div className="modal-field">
                        <label htmlFor="m-estado">Estado</label>
                        <select
                            id="m-estado"
                            value={form.is_active ? 'Activo' : 'Inactivo'}
                            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'Activo' }))}
                        >
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                        <FieldError name="is_active" errors={fieldErrors} />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving || (Boolean(editingUser) && !hasChanges)}>
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </dialog>
        </div>
    );
}