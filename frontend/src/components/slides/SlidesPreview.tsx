import React, { useEffect, useState } from 'react';
import type { SlideDraft } from '../../types/slides';

interface SlidesPreviewProps {
  slides: SlideDraft[];
  isEditing?: boolean;
  onSlideChange?: (index: number, updatedSlide: SlideDraft) => void;
}

// Mappt den technischen slide_type auf ein lesbares Label und einen Modifier fürs Styling.
const SLIDE_TYPE_META: Record<string, { label: string; modifier: string }> = {
  title: { label: 'Titelfolie', modifier: 'slides-preview__frame--title' },
  content: { label: 'Inhalt', modifier: 'slides-preview__frame--content' },
  closing: { label: 'Abschluss', modifier: 'slides-preview__frame--closing' },
};

export const SlidesPreview: React.FC<SlidesPreviewProps> = ({ slides, isEditing, onSlideChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Deaktivieren der Tastatur-Navigation, wenn man tippt
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

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
  const meta = SLIDE_TYPE_META[currentSlide.slide_type] ?? {
    label: currentSlide.slide_type,
    modifier: 'slides-preview__frame--content',
  };
  const progressPercent = ((currentIndex + 1) / slides.length) * 100;

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange?.(currentIndex, { ...currentSlide, title: e.target.value });
  };

  const handleBulletChange = (idx: number, value: string) => {
    const newBullets = [...currentSlide.bullets];
    newBullets[idx] = value;
    onSlideChange?.(currentIndex, { ...currentSlide, bullets: newBullets });
  };

  const handleAddBullet = () => {
    const newBullets = [...currentSlide.bullets, 'Neuer Punkt'];
    onSlideChange?.(currentIndex, { ...currentSlide, bullets: newBullets });
  };

  const handleRemoveBullet = (idx: number) => {
    const newBullets = currentSlide.bullets.filter((_, i) => i !== idx);
    onSlideChange?.(currentIndex, { ...currentSlide, bullets: newBullets });
  };

  const handleExampleChange = (idx: number, value: string) => {
    const newExamples = [...(currentSlide.examples ?? [])];
    newExamples[idx] = value;
    onSlideChange?.(currentIndex, { ...currentSlide, examples: newExamples });
  };

  const handleRemoveExample = (idx: number) => {
    const newExamples = (currentSlide.examples ?? []).filter((_, i) => i !== idx);
    onSlideChange?.(currentIndex, { ...currentSlide, examples: newExamples });
  };

  return (
    <section className="slides-preview" aria-label="Folien-Vorschau">
      <header className="slides-preview__header">
        <span className={`slides-preview__badge slides-preview__badge--${currentSlide.slide_type}`}>
          {meta.label}
        </span>
        <p className="slides-preview__counter">
          Folie {currentIndex + 1} von {slides.length}
        </p>
      </header>

      <div
        key={currentIndex}
        className={`slides-preview__frame ${meta.modifier} ${isEditing ? 'slides-preview__frame--editable' : ''}`}
        role="group"
        aria-roledescription="Folie"
        aria-label={`Folie ${currentIndex + 1} von ${slides.length}: ${currentSlide.title}`}
      >
        <div className="slides-preview__content">
          {isEditing ? (
            <textarea
              className="slides-preview__title slides-preview__input slides-preview__input--title"
              value={currentSlide.title}
              onChange={handleTitleChange}
              rows={2}
            />
          ) : (
            <h2 className="slides-preview__title">{currentSlide.title}</h2>
          )}

          <ul className="slides-preview__bullets">
            {currentSlide.bullets.map((bullet, idx) => (
              <li 
                className="slides-preview__bullet" 
                key={idx} 
              >
                <span className="slides-preview__bullet-marker" aria-hidden="true" />
                {isEditing ? (
                  <div className="slides-preview__bullet-edit-group">
                    <textarea
                      className="slides-preview__input slides-preview__input--bullet"
                      value={bullet}
                      onChange={(e) => handleBulletChange(idx, e.target.value)}
                      rows={2}
                    />
                    <button 
                      type="button" 
                      className="slides-preview__icon-btn slides-preview__icon-btn--danger"
                      onClick={() => handleRemoveBullet(idx)}
                      title="Punkt löschen"
                      aria-label="Punkt löschen"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span>{bullet}</span>
                )}
              </li>
            ))}
            
            {isEditing && currentSlide.slide_type !== 'title' && (
              <li className="slides-preview__bullet slides-preview__bullet--add">
                <button 
                  type="button" 
                  className="slides-preview__add-btn"
                  onClick={handleAddBullet}
                >
                  + Punkt hinzufügen
                </button>
              </li>
            )}
          </ul>

          {(currentSlide.examples ?? []).length > 0 && (
            <ul className="slides-preview__examples" aria-label="Beispiele">
              {(currentSlide.examples ?? []).map((example, idx) => (
                <li className="slides-preview__example" key={idx}>
                  <span className="slides-preview__example-label" aria-hidden="true">Bsp.</span>
                  {isEditing ? (
                    <div className="slides-preview__bullet-edit-group">
                      <textarea
                        className="slides-preview__input slides-preview__input--bullet"
                        value={example}
                        onChange={(e) => handleExampleChange(idx, e.target.value)}
                        rows={2}
                      />
                      <button
                        type="button"
                        className="slides-preview__icon-btn slides-preview__icon-btn--danger"
                        onClick={() => handleRemoveExample(idx)}
                        title="Beispiel löschen"
                        aria-label="Beispiel löschen"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span>{example}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="slides-preview__footer" aria-hidden="true">
          <span className="slides-preview__footer-brand">AI-LV Assistant</span>
          <span className="slides-preview__footer-number">{String(currentIndex + 1).padStart(2, '0')}</span>
        </div>
      </div>

      <div
        className="slides-preview__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={slides.length}
        aria-valuenow={currentIndex + 1}
        aria-label="Fortschritt durch die Folien"
      >
        <div
          className="slides-preview__progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <nav className="slides-preview__dots" aria-label="Direkt zu einer Folie springen">
        {slides.map((slide, index) => (
          <button
            key={slide.position}
            type="button"
            className={`slides-preview__dot${index === currentIndex ? ' slides-preview__dot--active' : ''}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Zu Folie ${index + 1} springen`}
            aria-current={index === currentIndex ? 'true' : undefined}
          />
        ))}
      </nav>

      <div className="slides-preview__nav">
        <button
          className="secondary-button slides-preview__nav-button"
          type="button"
          disabled={isFirstSlide}
          onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
        >
          <span aria-hidden="true">←</span>
          Zurück
        </button>

        <p className="slides-preview__hint" aria-hidden="true">
          Tipp: Mit den Pfeiltasten navigieren
        </p>

        <button
          className="primary-button slides-preview__nav-button"
          type="button"
          disabled={isLastSlide}
          onClick={() => setCurrentIndex((index) => Math.min(index + 1, slides.length - 1))}
        >
          Weiter
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
};
