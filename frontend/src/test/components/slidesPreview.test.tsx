import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SlidesPreview } from '../../components/SlidesPreview';
import type { SlideDraft } from '../../types/slides';

const mockSlides: SlideDraft[] = Array.from({ length: 12 }, (_, index) => ({
  position: index + 1,
  slide_type: 'content',
  title: `Titel Folie ${index + 1}`,
  bullets: [`Bullet ${index + 1}.1`, `Bullet ${index + 1}.2`],
}));

describe('SlidesPreview Component', () => {
  it('startet auf Folie 1', () => {
    render(<SlidesPreview slides={mockSlides} />);

    expect(screen.getByText(/Folie 1 von 12/i)).toBeInTheDocument();
  });

  it('navigiert mit Weiter zur nächsten Folie', () => {
    render(<SlidesPreview slides={mockSlides} />);

    const nextButton = screen.getByRole('button', { name: /Weiter/i });

    fireEvent.click(nextButton);

    expect(screen.getByText(/Folie 2 von 12/i)).toBeInTheDocument();
  });

  it('navigiert mit Zurück zur vorherigen Folie', () => {
    render(<SlidesPreview slides={mockSlides} />);

    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    const previousButton = screen.getByRole('button', { name: /Zurück/i });
    fireEvent.click(previousButton);

    expect(screen.getByText(/Folie 1 von 12/i)).toBeInTheDocument();
  });

  it('deaktiviert Zurück auf der ersten Folie', () => {
    render(<SlidesPreview slides={mockSlides} />);

    expect(screen.getByRole('button', { name: /Zurück/i })).toBeDisabled();
  });

  it('deaktiviert Weiter auf der letzten Folie', () => {
    render(<SlidesPreview slides={mockSlides} />);

    const nextButton = screen.getByRole('button', { name: /Weiter/i });

    for (let index = 1; index < mockSlides.length; index += 1) {
      fireEvent.click(nextButton);
    }

    expect(screen.getByText(/Folie 12 von 12/i)).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it('navigiert mit Pfeiltasten', () => {
    render(<SlidesPreview slides={mockSlides} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Folie 2 von 12/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Folie 1 von 12/i)).toBeInTheDocument();
  });

  it('zeigt Titel und Bullets getrennt an', () => {
    render(<SlidesPreview slides={mockSlides} />);
  
    expect(screen.getByRole('heading', { name: 'Titel Folie 1' })).toHaveClass('slides-preview-title');
    expect(screen.getByRole('list')).toHaveClass('slides-preview-bullets');
    expect(screen.getByText('Bullet 1.1')).toBeInTheDocument();
  });
});