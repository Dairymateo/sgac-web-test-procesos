/// <summary>
/// Componente UnderConstructionPage.test.tsx
/// </summary>
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UnderConstructionPage from '../../../pages/UnderConstruction/UnderConstructionPage';

describe('UnderConstructionPage', () => {
    it('renderiza el título del módulo', () => {
        render(<UnderConstructionPage title="Dashboard Principal" />);
        expect(screen.getByText('Módulo de Dashboard Principal')).toBeInTheDocument();
    });

    it('muestra badge de Próximamente', () => {
        render(<UnderConstructionPage title="Pólizas" />);
        expect(screen.getByText('Próximamente')).toBeInTheDocument();
    });

    it('muestra texto de módulo en desarrollo', () => {
        render(<UnderConstructionPage title="Test" />);
        expect(screen.getByText('Este módulo se encuentra actualmente en desarrollo.')).toBeInTheDocument();
    });

    it('muestra sub-texto informativo', () => {
        render(<UnderConstructionPage title="Test" />);
        expect(screen.getByText(/trabajando para habilitar/)).toBeInTheDocument();
    });
});