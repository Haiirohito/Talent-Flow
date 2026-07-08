import React from 'react';

type BadgeType = 'role' | 'active' | 'ticket-status' | 'stage';

interface StatusBadgeProps {
  type: BadgeType;
  value: string;
  label?: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, label, className = '' }) => {
  const normalizedValue = value.toLowerCase();
  let baseClass = 'badge ';

  if (type === 'role') {
    // Roles: admin, team_lead, recruiter, employee, viewer
    baseClass += `badge-${normalizedValue} badge-user`;
  } else if (type === 'active') {
    // Active boolean strings: "true", "false", "active", "inactive"
    const isActive = normalizedValue === 'true' || normalizedValue === 'active';
    baseClass += isActive ? 'badge-active' : 'badge-inactive';
  } else if (type === 'ticket-status') {
    // Ticket Statuses: active, on_hold, cancelled, closed
    baseClass += `badge-status-${normalizedValue}`;
  } else if (type === 'stage') {
    // Stages: requirement_created, etc.
    baseClass += 'badge-stage';
    if (normalizedValue === 'closed') {
      baseClass = 'badge badge-stage-closed';
    } else if (normalizedValue === 'joined' || normalizedValue === 'collection_running') {
      baseClass = 'badge badge-stage-success';
    }
  }

  const displayLabel = label || value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`${baseClass} ${className}`.trim()}>
      <span className="badge-dot" />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
