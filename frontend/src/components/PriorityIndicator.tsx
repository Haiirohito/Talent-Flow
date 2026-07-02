import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from './icons';

interface PriorityIndicatorProps {
  priority: string;
  readonly?: boolean;
  onChange?: (newPriority: string) => void;
}

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'default', label: 'Default' },
];

const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({
  priority,
  readonly = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedPriority = priority.toLowerCase();
  const currentPriority = PRIORITIES.find(p => p.value === normalizedPriority) || PRIORITIES[3];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setIsOpen(false);
    if (onChange && val !== normalizedPriority) {
      onChange(val);
    }
  };

  return (
    <div className="action-menu" ref={containerRef}>
      <div
        className={`priority-indicator priority-${currentPriority.value}`}
        onClick={() => !readonly && setIsOpen(!isOpen)}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
        title={readonly ? `Priority: ${currentPriority.label}` : 'Click to change priority'}
      >
        <div className="priority-dot" />
        <span>{currentPriority.label}</span>
        {!readonly && <ChevronDown style={{ width: 12, height: 12, opacity: 0.6 }} />}
      </div>

      {isOpen && !readonly && (
        <div className="priority-popover">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              className={`priority-option ${normalizedPriority === p.value ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(p.value);
              }}
            >
              <div className={`priority-indicator priority-${p.value}`} style={{ padding: 0, pointerEvents: 'none' }}>
                <div className="priority-dot" />
              </div>
              <span style={{ flex: 1 }}>{p.label}</span>
              {normalizedPriority === p.value && <Check style={{ width: 14, height: 14 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriorityIndicator;
