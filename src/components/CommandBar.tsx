import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CO2Clock } from '../layers/ui/CO2Clock';

interface CommandBarProps {
  inputText: string;
  setInputText: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  noaaPpm?: number;
}

/** Header bar with NLP activity input, WASM readiness badge, and live CO₂ clock. */
export const CommandBar: React.FC<CommandBarProps> = ({
  inputText,
  setInputText,
  onSubmit,
  isProcessing,
  noaaPpm,
}) => {
  // FIX: use React state for hint visibility — more reliable than CSS sibling selector
  const [showHint, setShowHint] = useState(false);

  return (
    <header className="command-bar-header">
      {/* LEFT: Logo & Badge */}
      <div className="command-bar-logo-container">
        <h1 className="text-section-header command-bar-title">
          EcoTrack
        </h1>
        <span className="command-bar-badge">
          WASM ENGINE ACTIVE
        </span>
      </div>

      {/* CENTER: Hero NL Input */}
      <form onSubmit={onSubmit} className="command-bar-form">
        <div className="command-bar-input-container">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setShowHint(true)}
            onBlur={() => setShowHint(false)}
            aria-label="Describe a carbon-producing activity"
            maxLength={500}
            placeholder={
              isProcessing
                ? 'Claude is thinking...'
                : 'I drove 40km to work today...'
            }
            disabled={isProcessing}
            className={`interactive-element command-bar-input ${isProcessing ? 'command-bar-input-processing animate-sweep-border' : ''}`}
          />
          {isProcessing && (
            <div className="command-bar-loader">
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}

          {/* Visually hidden submit button for accessibility */}
          <button type="submit" className="sr-only">
            Submit
          </button>

          {/* FIX: React-controlled hint — reliable across all browsers */}
          <div className={`command-bar-hint ${showHint ? 'show' : ''}`}>
            Tip: Be specific — 'I drove 40km' works better than 'gym'
          </div>
        </div>
      </form>

      {/* RIGHT: CO2 Clock */}
      <div className="command-bar-clock-container">
        <CO2Clock initialPpm={noaaPpm} compact />
      </div>
    </header>
  );
};
