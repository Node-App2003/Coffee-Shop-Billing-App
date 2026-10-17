import { useMemo } from 'react';
import { getRange } from '../utils.js';

export const RANGES = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This Week'],
  ['month', 'This Month'],
  ['year', 'This Year'],
  ['all', 'All'],
  ['custom', 'Custom'],
];

export const initialRange = (key = 'today') => ({ key, from: '', to: '' });

// Converts the picker state into {from, to} Date objects.
export function useRange(r) {
  return useMemo(() => getRange(r.key, r.from, r.to), [r.key, r.from, r.to]);
}

export default function RangePicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="tabs" style={{ marginBottom: value.key === 'custom' ? 10 : 0 }}>
        {RANGES.map(([k, label]) => (
          <button
            key={k}
            className={`tab ${value.key === k ? 'active' : ''}`}
            onClick={() => onChange({ ...value, key: k })}
          >
            {label}
          </button>
        ))}
      </div>
      {value.key === 'custom' && (
        <div className="row wrap">
          <label className="small muted">From</label>
          <input
            className="input"
            style={{ width: 160 }}
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <label className="small muted">To</label>
          <input
            className="input"
            style={{ width: 160 }}
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
