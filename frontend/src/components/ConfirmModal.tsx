import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, RefreshCcw } from './icons';

type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  /** If true, shows a required text input that the user must fill */
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputMinLength?: number;
  inputValue?: string;
  onInputChange?: (val: string) => void;
  loading?: boolean;
  children?: React.ReactNode;
}

const variantIconMap: Record<ModalVariant, React.ReactNode> = {
  danger: <Trash2 />,
  warning: <AlertTriangle />,
  info: <Info />,
  success: <RefreshCcw />,
};

const variantClassMap: Record<ModalVariant, string> = {
  danger: 'modal-icon-danger',
  warning: 'modal-icon-warning',
  info: 'modal-icon-info',
  success: 'modal-icon-success',
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireInput = false,
  inputLabel,
  inputPlaceholder,
  inputMinLength = 0,
  inputValue = '',
  onInputChange,
  loading = false,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = !requireInput || (inputValue.trim().length >= inputMinLength);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-icon ${variantClassMap[variant]}`}>
            {variantIconMap[variant]}
          </div>
          <div className="modal-header-text">
            <div className="modal-title">{title}</div>
            <div className="modal-description">{description}</div>
          </div>
        </div>

        {requireInput && (
          <div className="modal-body">
            {inputLabel && <label className="form-label">{inputLabel}</label>}
            <textarea
              className="form-input"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={e => onInputChange?.(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
              autoFocus
            />
            {inputMinLength > 0 && (
              <div className="form-hint">
                Minimum {inputMinLength} characters ({inputValue.trim().length}/{inputMinLength})
              </div>
            )}
          </div>
        )}

        {children && (
          <div className="modal-body" style={{ paddingTop: requireInput ? 0 : 20 }}>
            {children}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : variant === 'success' ? 'btn-success' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
