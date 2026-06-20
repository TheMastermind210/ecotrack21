import React from 'react';
import type { HistoryEntry } from '../types';
import { CATEGORY_COLORS } from '../constants/categoryColors';
import { CategoryIcon } from './CategoryIcon';

/** Renders the 5 most recent carbon activity entries with category icons and CO₂ amounts. */
export const ActivityFeed: React.FC<{ history: HistoryEntry[] }> = ({ history }) => {
  const recent = history.slice(0, 5);

  if (!recent.length) {
    return (
      <div className="activity-feed-empty">
        Log your first activity above ↑
      </div>
    );
  }

  return (
    <div className="activity-feed-list" role="list">
      <h3 className="text-section-header activity-feed-title">Recent Activity</h3>
      {recent.map((entry, idx) => (
        <div 
          key={entry.id} 
          role="listitem"
          aria-label={`${entry.activity}, ${entry.co2_kg} kg CO2, ${entry.category}`}
          className={`activity-feed-item ${idx === 0 ? "animate-slide-in" : ""}`}
        >
          <div className="activity-feed-details">
            <span className="text-body activity-feed-activity">{entry.activity}</span>
            <span className="activity-feed-quantity">
              {entry.quantity && entry.quantity > 0 ? `${entry.quantity} ${entry.unit}` : <i className="text-secondary-italic">quantity unknown</i>}
            </span>
            <div 
              className="text-caption activity-feed-category" 
              style={{ color: CATEGORY_COLORS[entry.category] || 'var(--text-secondary)' }}
            >
              <CategoryIcon category={entry.category} />
              <span>{entry.category}</span>
            </div>
          </div>
          <div className="activity-feed-co2">
            +{entry.co2_kg} kg
          </div>
        </div>
      ))}
    </div>
  );
};
