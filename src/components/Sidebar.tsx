import type { ReactNode } from 'react';
import { IconBell, IconBin, IconChart, IconHome, IconMap, IconSettings } from './Icons';

export type View = 'dashboard' | 'bins' | 'map' | 'alerts' | 'analytics' | 'settings';

const ITEMS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconHome size={22} /> },
  { id: 'bins', label: 'Bins', icon: <IconBin size={22} /> },
  { id: 'map', label: 'Map & Route', icon: <IconMap size={22} /> },
  { id: 'alerts', label: 'Alerts', icon: <IconBell size={22} /> },
  { id: 'analytics', label: 'Analytics', icon: <IconChart size={22} /> },
  { id: 'settings', label: 'Settings', icon: <IconSettings size={22} /> },
];

function Charminar() {
  return (
    <svg viewBox="0 0 200 120" className="sidebar-art" aria-hidden="true">
      <g fill="#ffffff" opacity="0.12">
        <rect x="30" y="20" width="14" height="100" />
        <rect x="156" y="20" width="14" height="100" />
        <path d="M27 20h20l-10-14z M153 20h20l-10-14z" />
        <rect x="44" y="60" width="112" height="60" />
        <path d="M84 120V95a16 16 0 0 1 32 0v25z" fill="#0c3a1c" opacity="1" />
        <rect x="44" y="52" width="112" height="8" />
        {[52, 70, 88, 106, 124, 142].map((x) => (
          <rect key={x} x={x} y="66" width="8" height="12" rx="4" fill="#0c3a1c" opacity="1" />
        ))}
      </g>
    </svg>
  );
}

export function Sidebar({ view, onNavigate, unread }: { view: View; onNavigate: (v: View) => void; unread: number }) {
  return (
    <nav className="sidebar" aria-label="Main">
      <ul>
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'alerts' && unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-foot">
        <Charminar />
        <p className="script">
          Smart Waste
          <br />
          Smart City
          <br />
          Better Tomorrow
        </p>
      </div>
    </nav>
  );
}
