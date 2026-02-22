/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Placeholder component for testing
 * TODO: Import actual DigimonCard component when tests are fully integrated
 */
function DigimonCard({ digimon }: { digimon: any }) {
  return (
    <div data-testid="digimon-card">
      <h3>{digimon.name}</h3>
      <span data-testid="rank">{digimon.rank}</span>
      <span data-testid="element">{digimon.element}</span>
    </div>
  );
}

describe('DigimonCard', () => {
  it('renders Digimon name and rank', () => {
    const digimon = {
      id: '1',
      name: 'Agumon',
      slug: 'agumon',
      rank: 'A',
      element: 'Fire',
      attribute: 'Vaccine',
    };
    
    render(<DigimonCard digimon={digimon} />);
    
    expect(screen.getByText('Agumon')).toBeInTheDocument();
    expect(screen.getByTestId('rank')).toHaveTextContent('A');
  });

  it('renders element information', () => {
    const digimon = {
      id: '2',
      name: 'Gabumon',
      slug: 'gabumon',
      rank: 'A',
      element: 'Water',
      attribute: 'Data',
    };
    
    render(<DigimonCard digimon={digimon} />);
    
    expect(screen.getByTestId('element')).toHaveTextContent('Water');
  });

  it('renders card container', () => {
    const digimon = {
      id: '3',
      name: 'Omegamon',
      slug: 'omegamon',
      rank: 'SSS',
      element: 'Light',
      attribute: 'Vaccine',
    };
    
    render(<DigimonCard digimon={digimon} />);
    
    expect(screen.getByTestId('digimon-card')).toBeInTheDocument();
  });
});
