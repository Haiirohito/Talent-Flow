import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Ban, Check } from './icons';

const STAGE_ORDER = [
  { key: 'requirement_created', short: 'Created', label: 'Requirement Created' },
  { key: 'candidates_added', short: 'Sourced', label: 'Candidates Added' },
  { key: 'interview_date_pending', short: 'Date', label: 'Interview Date Pending' },
  { key: 'interview_scheduled', short: 'Sched.', label: 'Interview Scheduled' },
  { key: 'candidate_confirmation_pending', short: 'Confirm', label: 'Confirmation Pending' },
  { key: 'interview_completed', short: 'Done', label: 'Interview Completed' },
  { key: 'interview_feedback_pending', short: 'Feedback', label: 'Feedback Pending' },
  { key: 'selected', short: 'Selected', label: 'Selected' },
  { key: 'joining_pending', short: 'Joining', label: 'Joining Pending' },
  { key: 'joined', short: 'Joined', label: 'Joined' },
  { key: 'billing_pending', short: 'Billing', label: 'Billing Pending' },
  { key: 'collection_running', short: 'Collect', label: 'Collection Running' },
  { key: 'closed', short: 'Closed', label: 'Closed' },
];

interface StagePipelineProps {
  currentStage: string;
  validNextStages?: string[];
  onTransition?: (stage: string) => void;
  compact?: boolean;
  variant?: 'default' | 'detail';
}

type TransitionKind = 'backward' | 'forward' | 'stop';

const getTransitionMeta = (stageKey: string, stageIdx: number, currentIdx: number) => {
  if (stageKey === 'closed') {
    return {
      kind: 'stop' as TransitionKind,
      label: 'Forward stop',
      actionLabel: 'Close',
      Icon: Ban,
    };
  }

  if (currentIdx >= 0 && stageIdx < currentIdx) {
    return {
      kind: 'backward' as TransitionKind,
      label: 'Backward step',
      actionLabel: 'Move back',
      Icon: ArrowLeft,
    };
  }

  return {
    kind: 'forward' as TransitionKind,
    label: 'Forward step',
    actionLabel: 'Advance',
    Icon: ArrowRight,
  };
};

const StagePipeline: React.FC<StagePipelineProps> = ({
  currentStage,
  validNextStages = [],
  onTransition,
  compact = false,
  variant = 'default',
}) => {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const currentIdx = STAGE_ORDER.findIndex(s => s.key === currentStage);
  const currentStageMeta = STAGE_ORDER[currentIdx] || {
    key: currentStage,
    short: 'Current',
    label: currentStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  };
  const completedCount = currentIdx >= 0 ? currentIdx + 1 : 0;
  const progressPercent = Math.round((completedCount / STAGE_ORDER.length) * 100);
  const availableStages = STAGE_ORDER.filter(stage => validNextStages.includes(stage.key));

  if (compact) {
    return (
      <div className="stage-pipeline-compact" title={STAGE_ORDER.find(s => s.key === currentStage)?.label || currentStage}>
        {STAGE_ORDER.map((stage, idx) => (
          <div
            key={stage.key}
            className={`stage-pip${idx < currentIdx ? ' completed' : ''}${idx === currentIdx ? ' current' : ''}`}
            title={stage.label}
          />
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="stage-detail" aria-label="Pipeline stage progress">
        <div className="stage-detail-summary">
          <div>
            <span className="stage-detail-eyebrow">Current stage</span>
            <div className="stage-detail-current">{currentStageMeta.label}</div>
          </div>
          <span className="stage-detail-count">
            {currentIdx >= 0 ? `Step ${currentIdx + 1} of ${STAGE_ORDER.length}` : 'Unknown step'}
          </span>
        </div>

        <div className="stage-progress" aria-hidden="true">
          <div className="stage-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="stage-detail-actions">
          <span className="stage-detail-eyebrow">Available transitions</span>
          {availableStages.length > 0 && onTransition ? (
            <div className="stage-action-list">
              {availableStages.map(stage => {
                const stageIdx = STAGE_ORDER.findIndex(s => s.key === stage.key);
                const transitionMeta = getTransitionMeta(stage.key, stageIdx, currentIdx);
                const TransitionIcon = transitionMeta.Icon;

                return (
                  <button
                    key={stage.key}
                    type="button"
                    className={`stage-action stage-action-${transitionMeta.kind}`}
                    onClick={() => onTransition(stage.key)}
                  >
                    <span className="stage-action-main">
                      <span className="stage-action-label">{stage.label}</span>
                      <span className="stage-action-direction">{transitionMeta.label}</span>
                    </span>
                    <TransitionIcon />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="stage-empty-note">No stage transitions available.</div>
          )}
        </div>

        <ol className="stage-timeline">
          {STAGE_ORDER.map((stage, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isClickable = validNextStages.includes(stage.key) && onTransition;
            const transitionMeta = isClickable
              ? getTransitionMeta(stage.key, idx, currentIdx)
              : null;

            return (
              <li
                key={stage.key}
                className={`stage-timeline-item${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${transitionMeta ? ` available transition-${transitionMeta.kind}` : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="stage-timeline-marker">
                  {isCompleted ? <Check /> : idx + 1}
                </span>
                <span className="stage-timeline-copy">
                  <span className="stage-timeline-label">{stage.label}</span>
                  <span className="stage-timeline-status">
                    {isCurrent ? 'Current' : isCompleted ? 'Completed' : transitionMeta ? transitionMeta.label : 'Upcoming'}
                  </span>
                </span>
                {transitionMeta && (
                  <button
                    type="button"
                    className={`stage-timeline-action stage-timeline-action-${transitionMeta.kind}`}
                    onClick={() => onTransition?.(stage.key)}
                  >
                    {transitionMeta.actionLabel}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="stage-pipeline">
      {STAGE_ORDER.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isClickable = validNextStages.includes(stage.key) && onTransition;

        return (
          <div className="stage-pipeline-step" key={stage.key}>
            {idx > 0 && (
              <div className={`stage-connector${isCompleted ? ' completed' : ''}`} />
            )}
            <div
              className={`stage-node${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${isClickable ? ' clickable' : ''}`}
              onClick={() => isClickable && onTransition?.(stage.key)}
              onMouseEnter={() => setHoveredStage(stage.key)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              {isCompleted ? <Check /> : (idx + 1)}
              {hoveredStage === stage.key && (
                <span className="stage-tooltip">{stage.label}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StagePipeline;

export { STAGE_ORDER };
