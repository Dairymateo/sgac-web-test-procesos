/// <summary>
/// Componente FieldError.tsx
/// </summary>
export function FieldError({ name, errors }: Readonly<{ name: string; errors: Record<string, string> }>) {
    return errors[name] ? <span className="field-error">{errors[name]}</span> : null;
}