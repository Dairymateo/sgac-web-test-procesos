/// <summary>
/// Componente ConfirmDialog.tsx
/// </summary>
import './ConfirmDialog.css';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiTrash2 } from 'react-icons/fi';
import ModalCloseButton from './ModalCloseButton';

type ConfirmVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
    readonly isOpen: boolean;
    readonly title: string;
    readonly message: string;
    readonly confirmLabel?: string;
    readonly cancelLabel?: string;
    readonly variant?: ConfirmVariant;
    readonly isLoading?: boolean;
    readonly error?: string | null;
    readonly onCancel: () => void;
    readonly onConfirm: () => void | Promise<void>;
}

const variantIcon = {
    danger: <FiTrash2 />,
    warning: <FiAlertTriangle />,
    success: <FiCheckCircle />,
    info: <FiInfo />,
};

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'warning',
    isLoading = false,
    error = null,
    onCancel,
    onConfirm,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="confirm-overlay">
            <dialog open className="confirm-dialog" aria-modal="true" aria-labelledby="confirm-title">
                <div className="confirm-close">
                    <ModalCloseButton onClick={onCancel} disabled={isLoading} />
                </div>
                <div className={`confirm-icon confirm-icon--${error ? 'warning' : variant}`} aria-hidden="true">
                    {variantIcon[error ? 'warning' : variant]}
                </div>
                <div className="confirm-content">
                    <h2 id="confirm-title">{error ? 'No se pudo realizar la acción' : title}</h2>
                    <p>{error || message}</p>
                </div>
                <div className="confirm-actions">
                    {error ? (
                        <button type="button" className="confirm-btn confirm-btn--secondary" onClick={onCancel}>
                            Entendido
                        </button>
                    ) : (
                        <>
                            <button type="button" className="confirm-btn confirm-btn--secondary" onClick={onCancel} disabled={isLoading}>
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={`confirm-btn confirm-btn--${variant}`}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Procesando...' : confirmLabel}
                            </button>
                        </>
                    )}
                </div>
            </dialog>
        </div>
    );
}