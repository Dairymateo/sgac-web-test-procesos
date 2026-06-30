/// <summary>
/// Componente ModalCloseButton.tsx
/// </summary>
import { FiX } from 'react-icons/fi';

interface ModalCloseButtonProps {
    readonly onClick: () => void;
    readonly disabled?: boolean;
    readonly label?: string;
}

export default function ModalCloseButton({
    onClick,
    disabled = false,
    label = 'Cerrar',
}: ModalCloseButtonProps) {
    return (
        <button
            className="modal-close"
            onClick={onClick}
            aria-label={label}
            title={label}
            type="button"
            disabled={disabled}
        >
            <FiX aria-hidden="true" />
        </button>
    );
}