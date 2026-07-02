import React, { useEffect, useState, useRef } from 'react';
import { X } from './icons';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'wide';
  mode?: 'modal' | 'non-modal';
}

const CLOSE_ANIMATION_MS = 400;

const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  mode = 'modal',
}) => {
  const [render, setRender] = useState(isOpen);
  const isModal = mode === 'modal';
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      // If clicking inside the SlideOver panel, don't close
      if (panelRef.current && panelRef.current.contains(target)) return;
      // Ignore clicks on popups like modals and toasts that render outside
      if (target.closest('.modal-overlay, .modal, .toast-container, .toast')) return;
      
      onClose();
    };

    // Use slight delay before attaching so that the click that opened the panel doesn't close it
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setRender(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !render) return;

    const timeoutId = window.setTimeout(() => {
      setRender(false);
    }, CLOSE_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, render]);

  const onPanelAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!isOpen) setRender(false);
  };

  // Prevent body scroll only for modal drawers.
  useEffect(() => {
    if (!isModal || !isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isModal]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!render) return null;

  return (
    <>
      {isModal && (
        <div
          className="slide-over-overlay"
          onClick={onClose}
          style={{ animation: isOpen ? 'fadeIn 0.2s ease forwards' : 'fadeIn 0.2s ease reverse forwards' }}
        />
      )}
      <div 
        ref={panelRef}
        className={`slide-over ${variant === 'wide' ? 'slide-over-wide' : ''}`}
        style={{ animation: isOpen ? 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'slideOutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        onAnimationEnd={onPanelAnimationEnd}
        role="dialog"
        aria-modal={isModal}
      >
        <div className="slide-over-header">
          <span className="slide-over-title">{title}</span>
          <button className="slide-over-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="slide-over-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideOver;
