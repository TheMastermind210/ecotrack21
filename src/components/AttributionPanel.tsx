import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { HistoryEntry } from '../types';
import { CATEGORY_COLORS } from '../constants/categoryColors';
import { evaluateProgress } from '../utils/progress';
import { CategoryIcon } from './CategoryIcon';

interface AttributionPanelProps {
  history: HistoryEntry[];
  narrative: string;
  narrativesEnabled?: boolean;
  onNarrativesEnabledChange?: (enabled: boolean) => void;
}


/** Carbon intelligence dashboard with category breakdown chart, score gauge, and AI narrative. */
export const AttributionPanel: React.FC<AttributionPanelProps> = ({
  history,
  narrative,
  narrativesEnabled = true,
  onNarrativesEnabledChange,
}) => {
  const categoryBreakdown = useMemo(() => {
    const categoryTotals = history.reduce((acc: Record<string, number>, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.co2_kg;
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([category, total]) => ({ category, total }));
  }, [history]);

  const { score, verdict } = evaluateProgress(history);
  const arcStrokeDasharray = `${(score / 100) * 283} 283`;

  let scoreColor = 'var(--border-color)';
  if (history.length > 0) {
    if (score <= 40) { scoreColor = 'var(--danger-color)'; }
    else if (score <= 70) { scoreColor = '#f59e0b'; }
    else { scoreColor = 'var(--accent-color)'; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts tick props lack a stable exported type
  const renderCustomYAxisTick = (props: Record<string, any>) => {
    const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-20} y={4} dy={0} textAnchor="end" fill="var(--text-secondary)" fontSize={11} style={{ textTransform: 'capitalize' }}>
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="glass-panel attribution-panel-container">
      <h3 className="text-section-header">Carbon Intelligence</h3>
      {onNarrativesEnabledChange && (
        <label className="attribution-ai-toggle">
          <input
            type="checkbox"
            checked={narrativesEnabled}
            onChange={event => onNarrativesEnabledChange(event.target.checked)}
          />
          <span>
            Personalized AI insights
            <small>
              Sends up to 10 recent entries to the secure server proxy.
            </small>
          </span>
        </label>
      )}

      {/* Top Source Bar Chart */}
      {history.length > 0 && (
        <div className="attribution-chart-wrapper">
          <div className="text-caption">
            Emissions by Category
          </div>
          <div style={{ minHeight: '140px', height: Math.max(140, categoryBreakdown.length * 40), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryBreakdown} 
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <defs>
                  <pattern id="pattern-transport" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['transport']} />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                  </pattern>
                  <pattern id="pattern-food" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['food']} />
                    <circle cx="4" cy="4" r="2" fill="rgba(255,255,255,0.3)" />
                  </pattern>
                  <pattern id="pattern-energy" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['energy']} />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
                    <line x1="4" y1="0" x2="4" y2="8" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </pattern>
                  <pattern id="pattern-goods" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill={CATEGORY_COLORS['goods']} />
                    <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  </pattern>
                </defs>
                <XAxis 
                  type="number" 
                  hide={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickFormatter={(v) => `${v.toFixed(1)}kg`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="category"
                  tick={renderCustomYAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts Formatter generic is overly broad
                  formatter={(value: any) => [`${Number(value).toFixed(2)} kg CO₂`, 'Emissions']}
                />
                <Bar 
                  dataKey="total" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: 'right', 
                    fill: 'var(--text-secondary)', 
                    fontSize: 11,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts LabelFormatter type mismatch
                    formatter: (v: any) => `${Number(v).toFixed(1)}kg`
                  }}
                >
                  <LabelList dataKey="category" position="insideLeft" 
                    style={{ fill: 'var(--text-primary)', fontSize: 11, textTransform: 'capitalize' }} 
                  />
                  {categoryBreakdown.map((entry, index) => {
                    const patternId = `url(#pattern-${entry.category})`;
                    return (
                      <Cell 
                        key={index} 
                        fill={['transport', 'food', 'energy', 'goods'].includes(entry.category) ? patternId : (CATEGORY_COLORS[entry.category] || '#14b8a6')} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="attribution-legend-container">
            {categoryBreakdown.map(entry => (
              <div key={entry.category} className="attribution-legend-item">
                <span className="attribution-legend-icon" style={{ color: CATEGORY_COLORS[entry.category] || '#14b8a6' }}>
                  <CategoryIcon category={entry.category} size={12} />
                </span>
                <span className="attribution-legend-text">{entry.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counterfactual Box */}
      {narrative && (
        <div className="attribution-narrative-box">
          {narrative}
        </div>
      )}
      {!narrativesEnabled && history.length > 0 && (
        <p className="attribution-privacy-status">
          Personalized AI insights are off. Your saved history remains local.
        </p>
      )}

      {/* Circular Progress Indicator */}
      <div className="attribution-score-container">
        <div className="attribution-score-row">
          <div className="attribution-score-meter" role="meter" aria-valuenow={history.length > 0 ? Math.round(score) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly sustainability score">
            <svg viewBox="0 0 100 100" className="attribution-score-svg">
              <circle cx="50" cy="50" r="45" fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="45" 
                fill="transparent" 
                stroke={scoreColor} 
                strokeWidth="8" 
                strokeDasharray={history.length > 0 ? arcStrokeDasharray : "0 283"}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
              />
            </svg>
            <div className="attribution-score-value">
              {history.length > 0 ? Math.round(score) : "—"}
            </div>
          </div>
          <div className="text-caption">Weekly Score</div>
        </div>
        {history.length > 0 && (
          <div className="attribution-score-verdict" style={{ color: scoreColor }}>
            {verdict}
          </div>
        )}
      </div>
    </div>
  );
};
