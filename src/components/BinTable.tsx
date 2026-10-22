import { useState } from 'react';
import { binLevel, binPriority, hasCoords } from '../data/binMapper';
import type { BinsState } from '../hooks/useBins';
import type { Bin, BinLevel } from '../types';
import { fmtPct, fmtTime } from './format';
import { IconBin, IconPause, IconPlay, IconRefresh } from './Icons';

type Filter = 'all' | BinLevel | 'route';

export function FillBar({ fill, threshold }: { fill: number; threshold: number }) {
  const level = binLevel(fill, threshold);
  return (
    <div className="fill">
      <span className="fill-num">{fmtPct(fill)}</span>
      <div className="fill-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill} aria-label={`Fill level ${fmtPct(fill)}`}>
        <div className={`fill-bar lvl-${level}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

export function BinTable(p: { bins: Bin[]; threshold: number; test: BinsState['test']; compact?: boolean; title?: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const rows = p.bins.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'route') return b.fillLevel >= p.threshold;
    return binLevel(b.fillLevel, p.threshold) === filter;
  });

  return (
    <section className="card">
      <div className="card-head">
        <h2><IconBin size={22} /> {p.title ?? 'Bin Status'}</h2>
        <select className="select-sm" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter bins">
          <option value="all">All Bins</option>
          <option value="Normal">Normal</option>
          <option value="Full">Full</option>
          <option value="Critical">Critical</option>
          <option value="route">To collect (≥ {p.threshold}%)</option>
        </select>
      </div>

      {p.test && !p.compact && <TestControls test={p.test} />}

      <div className="table-wrap">
        <table className={`bins ${p.compact ? 'compact' : ''}`}>
          <thead>
            <tr>
              <th>Bin ID</th>
              <th>Address</th>
              <th>Fill Level</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Last Updated</th>
              {!p.compact && <th>Location</th>}
              {p.test && !p.compact && <th>Simulate sensor</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">No bins match this filter.</td>
              </tr>
            )}
            {rows.map((b) => {
              const level = binLevel(b.fillLevel, p.threshold);
              const prio = binPriority(b.fillLevel, p.threshold);
              return (
                <tr key={String(b.rowId)}>
                  <td className="binid">{b.binId}</td>
                  <td className="addr" title={b.address}>{b.address}</td>
                  <td><FillBar fill={b.fillLevel} threshold={p.threshold} /></td>
                  <td className={`txt-${level}`} title={b.rawStatus ? `Sensor status: ${b.rawStatus}` : undefined}>{level}</td>
                  <td className={`txt-prio-${prio}`}>{prio}</td>
                  <td>{fmtTime(b.lastUpdated)}</td>
                  {!p.compact && (
                    <td className="muted small">{hasCoords(b) ? `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}` : <span className="txt-Critical">No coordinates</span>}</td>
                  )}
                  {p.test && !p.compact && (
                    <td>
                      <div className="sim">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={b.fillLevel}
                          onChange={(e) => p.test!.setFill(b.binId, Number(e.target.value))}
                          aria-label={`Set fill level of ${b.binId}`}
                        />
                        <button className="btn tiny ghost" onClick={() => p.test!.setFill(b.binId, 0)}>Empty</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TestControls({ test }: { test: NonNullable<BinsState['test']> }) {
  return (
    <div className="test-bar">
      <span className="test-tag">TEST MODE</span>
      <span className="muted small">Sample bins — simulate HC-SR04 readings:</span>
      <button className="btn" onClick={test.tick}>Simulate sensor update</button>
      <button className={`btn ${test.autoSimulate ? 'warn' : ''}`} onClick={() => test.setAutoSimulate(!test.autoSimulate)}>
        {test.autoSimulate ? <IconPause size={16} /> : <IconPlay size={16} />} {test.autoSimulate ? 'Stop auto-simulate' : 'Auto-simulate'}
      </button>
      <button className="btn ghost" onClick={test.emptyFull}>Collect all full bins</button>
      <button className="btn ghost" onClick={test.reset}><IconRefresh size={16} /> Reset</button>
    </div>
  );
}
