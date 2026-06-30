export function isFormDirty<T>(current: T, initial: T): boolean {
    return JSON.stringify(current) !== JSON.stringify(initial);
}

export function getSaveButtonLabel(isSaving: boolean, isEditing: boolean): string {
    if (isSaving) return 'Guardando...';
    return isEditing ? 'Guardar cambios' : 'Guardar';
}
