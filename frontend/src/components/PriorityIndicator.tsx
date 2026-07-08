import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const normalizedPriority = priority.toLowerCase();
  const currentPriority = PRIORITIES.find(p => p.value === normalizedPriority) || PRIORITIES[3];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const clickedOutsidePopover = !popoverRef.current || !popoverRef.current.contains(target);
      
      if (clickedOutsideContainer && clickedOutsidePopover) {
        setIsOpen(false);
      }
    };
    
    // Close on any scroll so the dropdown doesn't detach from the scrolling table
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // true for capturing phase
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click
    if (readonly) return;
    
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

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
        onClick={toggleOpen}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
        title={readonly ? `Priority: ${currentPriority.label}` : 'Click to change priority'}
      >
        <div className="priority-dot" />
        <span>{currentPriority.label}</span>
        {!readonly && <ChevronDown style={{ width: 12, height: 12, opacity: 0.6 }} />}
      </div>

      {isOpen && !readonly && createPortal(
        <div 
          className="priority-popover" 
          ref={popoverRef}
          style={{ 
            position: 'fixed', 
            top: coords.top, 
            left: coords.left,
            margin: 0, // Reset any margins that might shift it
            zIndex: 9999
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default PriorityIndicator;
