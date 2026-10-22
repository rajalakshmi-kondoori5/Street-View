import type { ReactNode } from 'react';
import { binLevel } from '../data/binMapper';
import type { Bin, RoutePlan } from '../types';
import { fmtKm, fmtMin, fmtPct } from './format';
import { IconBin, IconChart, IconCheck, IconClock, IconRoute, IconSiren, IconTrend, IconWarn } from './Icons';

function Kpi({ tone, icon, label, value, sub }: { tone: string; icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className={`kpi tone-${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function BinKpis({ bins, threshold }: { bins: Bin[]; threshold: number }) {
  const levels = bins.map((b) => binLevel(b.fillLevel, threshold));
  const normal = levels.filter((l) => l === 'Normal').length;
  const full = levels.filter((l) => l === 'Full').length;
  const critical = levels.filter((l) => l === 'Critical').length;
  const avg = bins.length ? bins.reduce((s, b) => s + b.fillLevel, 0) / bins.length : 0;
  return (
    <div className="kpi-row five">
      <Kpi tone="green" icon={<IconBin size={30} />} label="Total Bins" value={bins.length} />
      <Kpi tone="green" icon={<IconCheck size={30} />} label="Normal Bins" value={normal} />
      <Kpi tone="amber" icon={<IconWarn size={30} />} label="Full Bins" value={full} />
      <Kpi tone="red" icon={<IconSiren size={30} />} label="Critical Bins" value={critical} />
      <Kpi tone="green" icon={<IconChart size={30} />} label="Average Fill Level" value={fmtPct(avg)} />
    </div>
  );
}

export function RouteKpis({ plan, computing }: { plan: RoutePlan | null; computing: boolean }) {
  const n = plan?.stops.length ?? 0;
  const est = plan?.source === 'estimated' ? ' (est.)' : '';
  const dash = computing && !plan ? '…' : '—';
  return (
    <div className="kpi-row four">
      <Kpi tone="plain" icon={<IconRoute size={30} />} label={`Total Route Distance${est}`} value={n ? fmtKm(plan!.totalKm) : dash} />
      <Kpi tone="plain" icon={<IconClock size={30} />} label={`Estimated Collection Time${est}`} value={n ? fmtMin(plan!.totalMin) : dash} />
      <Kpi tone="plain" icon={<IconBin size={30} />} label="Bins to Collect" value={n} />
      <Kpi tone="plain" icon={<IconTrend size={30} />} label="Collection Order" value={<span className="kpi-text">{n ? `Depot → ${n} Bin${n > 1 ? 's' : ''} → Depot` : 'No collection needed'}</span>} />
    </div>
  );
}
