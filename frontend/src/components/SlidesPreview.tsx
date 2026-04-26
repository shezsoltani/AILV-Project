import React, { useEffect, useState } from 'react';
import type { SlideDraft } from '../types/slides';

interface SlidesPreviewProps {
  slides: SlideDraft[];
}

export const SlidesPreview: React.FC<SlidesPreviewProps> = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((index) => Math.max(index - 1, 0));
      }

      if (event.key === 'ArrowRight') {
        setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];
  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <section className="slides-preview">
      <p className="slides-preview-counter">
        Folie {currentIndex + 1} von {slides.length}
      </p>

      <h2 className="slides-preview-title">{currentSlide.title}</h2>

      <ul className="slides-preview-bullets">
        {currentSlide.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <div className="slides-preview-navigation">
        <button
          className="secondary-button"
          type="button"
          disabled={isFirstSlide}
          onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
        >
          Zurück
        </button>

        <button
          className="primary-button"
          type="button"
          disabled={isLastSlide}
          onClick={() => setCurrentIndex((index) => Math.min(index + 1, slides.length - 1))}
        >
          Weiter
        </button>
      </div>
    </section>
  );
};