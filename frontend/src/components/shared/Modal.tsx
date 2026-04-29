// src/components/shared/Modal.tsx
// Wiederverwendbarer Modal-Container: Overlay, Header mit Titel + Close-Button,
// ESC-Taste schließt, Klick aufs Overlay schließt. Body wird als children übergeben.

import { useEffect, type ReactNode } from 'react';
import { ESCAPE_KEY } from '../../constants/appConstants';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  labelledById?: string;
  size?: 'default' | 'large';
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  labelledById = 'modal-title',
  size = 'default',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === ESCAPE_KEY) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="questions-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`questions-modal${size === 'large' ? ' questions-modal--large' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="questions-modal-header">
          <h2 id={labelledById}>{title}</h2>
          <button
            type="button"
            className="questions-modal-close"
            aria-label="Modal schließen"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
