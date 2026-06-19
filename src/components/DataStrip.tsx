import React, { useMemo } from 'react';
import type { HistoryEntry } from '../types';
import { getIsoWeekKey, getLocalDateKey } from '../utils/date';

export const DataStrip: React.FC<{ history: HistoryEntry[]; noaaPpm?: number }> = ({
  history,
  noaaPpm,
}) => {
  const totalEmissions = useMemo(() => {
    const today = getLocalDateKey(new Date());
    return history
      .filter(item => getLocalDateKey(item.date) === today)
      .reduce((sum, item) => sum + item.co2_kg, 0)
      .toFixed(1);
  }, [history]);

  const weekDelta = useMemo(() => {
    if (history.length === 0) return 0;

    const now = new Date();
    const thisWeekKey = getIsoWeekKey(now);
    
    // To get last week key reliably across year boundaries, subtract 7 days
    const lastWeekDate = new Date(now.getTime() - 7 * 86400000);
    const lastWeekKey = getIsoWeekKey(lastWeekDate);

    const grouped = history.reduce((acc: Record<string, number>, entry) => {
      const key = getIsoWeekKey(entry.date);
      if (key) acc[key] = (acc[key] || 0) + entry.co2_kg;
      return acc;
    }, {});

    const thisWeek = thisWeekKey ? grouped[thisWeekKey] || 0 : 0;
    const lastWeek = lastWeekKey ? grouped[lastWeekKey] || 0 : 0;

    if (lastWeek === 0 && history.length >= 2) {
      const avg =
        history.slice(1).reduce((s, e) => s + e.co2_kg, 0) /
        (history.length - 1);
      return Number(((history[0]?.co2_kg || 0) - avg).toFixed(1));
    }

    return Number((thisWeek - lastWeek).toFixed(1));
  }, [history]);

  const topSource = useMemo(() => {
    if (history.length === 0) return 'None';
    const totals = history.reduce((acc: Record<string, number>, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.co2_kg;
      return acc;
    }, {});
    return Object.entries(totals).sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1]
    )[0]?.[0] || 'None';
  }, [history]);

  const deltaColor =
    weekDelta > 0
      ? 'var(--danger-color)'
      : weekDelta < 0
      ? 'var(--accent-color)'
      : 'var(--text-secondary)';

  const deltaPrefix = weekDelta > 0 ? '+' : '';
  const noaaText = noaaPpm ? noaaPpm.toFixed(2) : '421.08';

  return (
    <>
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        Today's footprint is {totalEmissions} kg CO2. Week delta is {deltaPrefix}{weekDelta} kg. Top emission source is {topSource}. Global CO2 is {noaaText} PPM.
      </div>

      <div
        className="data-strip-container"
        aria-hidden="true"
      >
        <div className="data-strip-card">
          <div className="text-caption data-strip-card-title">
            Today's Footprint
          </div>
          <div className="data-strip-value-container">
            <span className="data-strip-hero-value">
              {totalEmissions}
            </span>
            <span className="text-body text-secondary">
              kg CO₂e
            </span>
          </div>
        </div>

        <div className="data-strip-card">
          <div className="text-caption data-strip-card-title">
            Week Delta
          </div>
          <div className="data-strip-value-container">
            <span
              className="data-strip-metric-value"
              style={{ color: deltaColor }}
            >
              {weekDelta === 0 ? '0.0' : `${deltaPrefix}${weekDelta}`}
            </span>
            <span className="text-body text-secondary">
              kg
            </span>
          </div>
          <div className="data-strip-vs-text">
            vs last week
          </div>
        </div>

        <div className="data-strip-card">
          <div className="text-caption data-strip-card-title">
            Top Emission Source
          </div>
          <div className="data-strip-source-text">
            {topSource}
          </div>
        </div>

        <div className="data-strip-card">
          <div className="text-caption data-strip-card-title">
            Global CO₂ PPM
          </div>
          <div className="data-strip-ppm-value">
            {noaaText}
          </div>
        </div>
      </div>
    </>
  );
};
