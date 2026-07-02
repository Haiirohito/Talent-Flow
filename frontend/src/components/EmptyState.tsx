import React from 'react';
import { LayoutGrid } from './icons';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  return (
    <div className="empty-state">
      {icon || <LayoutGrid />}
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-description" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>{description}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
