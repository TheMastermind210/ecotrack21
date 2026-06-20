import React from 'react';

interface OnboardingModalProps {
  show: boolean;
  onClose: () => void;
  onDemoData: () => void;
}

/**
 * Accessible modal dialog that greets new users and offers to load sample data.
 * Implements an ARIA dialog focus trap for accessibility compliance.
 */
export const OnboardingModal: React.FC<OnboardingModalProps> = ({ show, onClose, onDemoData }) => {
  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="modal-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        // Focus trap: keep Tab within modal
        if (e.key === 'Tab') {
          const modal = e.currentTarget;
          const focusable = modal.querySelectorAll<HTMLElement>(
            'button, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="modal-content">
        <h2 id="onboarding-modal-title" className="text-section-header onboarding-modal-title">
          Welcome to EcoTrack
        </h2>
        <p className="text-body onboarding-modal-text">
          Track your carbon footprint using our NLP-powered engine. 
          You can start logging your daily activities, or load some sample data to see how the dashboard works!
        </p>
        
        <div className="modal-footer">
          <button type="button" onClick={onDemoData} className="btn-text onboarding-modal-skip">
            Load sample data
          </button>
          <button type="button" autoFocus onClick={onClose} className="btn-primary">
            Start Tracking
          </button>
        </div>
      </div>
    </div>
  );
};
