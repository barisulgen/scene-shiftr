import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ActivationStep,
  OverlayStartPayload,
  OverlayStepPayload,
  OverlayCompletePayload,
} from '../../../../shared/types';

interface CompletionData {
  succeeded: number;
  total: number;
  skipped: number;
  failed: number;
}

export default function ActivationOverlay(): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('');
  const [isDeactivation, setIsDeactivation] = useState(false);
  const [steps, setSteps] = useState<ActivationStep[]>([]);
  const [completed, setCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const stepListRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current in-progress step
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [steps]);

  const handleFadeOut = useCallback((delay: number) => {
    setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        setFadeOut(false);
        setCompleted(false);
        setCompletionData(null);
        setSteps([]);
        setDismissed(false);
      }, 300);
    }, delay);
  }, []);

  // IPC listeners
  useEffect(() => {
    const cleanupStart = window.api.onOverlayStart((data: OverlayStartPayload) => {
      setWorkspaceName(data.workspaceName);
      setWorkspaceIcon(data.workspaceIcon);
      setIsDeactivation(data.isDeactivation);
      setSteps(data.steps);
      setCompleted(false);
      setCompletionData(null);
      setFadeOut(false);
      setDismissed(false);
      setVisible(true);
    });

    const cleanupStep = window.api.onOverlayStep((data: OverlayStepPayload) => {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === data.stepId
            ? { ...step, status: data.status, error: data.error }
            : step
        )
      );
    });

    const cleanupComplete = window.api.onOverlayComplete((data: OverlayCompletePayload) => {
      setCompleted(true);
      setCompletionData(data);
    });

    return () => {
      cleanupStart();
      cleanupStep();
      cleanupComplete();
    };
  }, []);

  // Handle auto-dismiss based on completion state
  useEffect(() => {
    if (!completed || !completionData) return;

    const { failed, skipped, total } = completionData;
    const majorityFailed = failed > total / 2;

    if (majorityFailed) {
      // Show dismiss button, don't auto-fade
      return;
    }

    if (skipped > 0) {
      handleFadeOut(3000);
    } else {
      handleFadeOut(1500);
    }
  }, [completed, completionData, handleFadeOut]);

  if (!visible) return null;

  // Calculate progress
  const finishedSteps = steps.filter(
    (s) => s.status === 'success' || s.status === 'skipped' || s.status === 'failed'
  ).length;
  const totalSteps = steps.length;
  const percentage = totalSteps > 0 ? Math.round((finishedSteps / totalSteps) * 100) : 0;

  // Title text
  let titleText: string;
  if (!completed) {
    titleText = isDeactivation
      ? `Closing ${workspaceName}...`
      : `Switching to ${workspaceName}...`;
  } else if (completionData) {
    const majorityFailed = completionData.failed > completionData.total / 2;
    if (majorityFailed) {
      titleText = 'Activation failed';
    } else if (completionData.skipped > 0) {
      titleText = `${workspaceName} activated \u2014 ${completionData.skipped} items skipped`;
    } else {
      titleText = `${workspaceName} is now active`;
    }
  } else {
    titleText = `${workspaceName} is now active`;
  }

  // Progress ring dimensions
  const ringSize = 120;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const showDismiss =
    completed &&
    completionData &&
    completionData.failed > completionData.total / 2;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 60,
        backgroundColor: 'rgba(15, 13, 21, 0.92)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 300ms ease',
        pointerEvents: 'auto',
      }}
    >
      {/* Progress Ring */}
      <div className="relative mb-3" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="block">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#E8636B" />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="#2a2435"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 300ms ease',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </svg>
        {/* Icon inside ring */}
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl"
          style={{ userSelect: 'none' }}
        >
          {workspaceIcon}
        </div>
      </div>

      {/* Percentage */}
      <div
        className="text-sm font-medium mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        {percentage}%
      </div>

      {/* Title */}
      <div
        className="text-lg font-semibold mb-1 text-center px-4"
        style={{ color: 'var(--text-primary)' }}
      >
        {titleText}
      </div>

      {/* Subtitle for skipped completion */}
      {completed && completionData && completionData.skipped > 0 &&
        completionData.failed <= completionData.total / 2 && (
        <div
          className="text-xs mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Check logs for details
        </div>
      )}

      {/* Step list */}
      <div
        ref={stepListRef}
        className="w-full max-w-sm mt-4 overflow-y-auto rounded-lg px-1"
        style={{
          maxHeight: '240px',
        }}
      >
        {steps.map((step) => {
          const isActive = step.status === 'in-progress';
          return (
            <div
              key={step.id}
              ref={isActive ? activeStepRef : undefined}
              className="flex items-center gap-3 py-1.5 px-3"
            >
              <StepIcon status={step.status} />
              <span
                className="text-sm flex-1 truncate"
                style={{
                  color:
                    step.status === 'success'
                      ? '#4ade80'
                      : step.status === 'in-progress'
                        ? 'var(--text-primary)'
                        : step.status === 'failed'
                          ? '#E8636B'
                          : step.status === 'skipped'
                            ? '#fbbf24'
                            : 'var(--text-muted)',
                }}
                title={step.error ? `${step.label} — ${step.error}` : step.label}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dismiss button (only for majority failure) */}
      {showDismiss && !dismissed && (
        <button
          onClick={() => {
            setDismissed(true);
            handleFadeOut(0);
          }}
          className="mt-6 px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-150"
          style={{ backgroundColor: 'var(--accent)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: ActivationStep['status'] }): JSX.Element {
  switch (status) {
    case 'pending':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="#5a5a6e" strokeWidth="1.5" />
        </svg>
      );
    case 'in-progress':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="animate-spin"
          style={{ animationDuration: '1s' }}
        >
          <circle cx="8" cy="8" r="6" stroke="#2a2435" strokeWidth="1.5" />
          <path
            d="M14 8a6 6 0 0 0-6-6"
            stroke="#E8636B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'success':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#4ade80" />
          <path
            d="M5 8l2 2 4-4"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'skipped':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.5l6.5 12H1.5L8 1.5z"
            fill="#fbbf24"
          />
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="white"
          >
            !
          </text>
        </svg>
      );
    case 'failed':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#E8636B" />
          <path
            d="M5.5 5.5l5 5M10.5 5.5l-5 5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
