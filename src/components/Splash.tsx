import { useEffect, useState, type AnimationEvent } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Wheel({ cx }: { cx: number }) {
  return (
    <g className="sp-wheel">
      <circle cx={cx} cy={190} r={15} fill="#20302a" />
      <circle cx={cx} cy={190} r={7} fill="#c9d4cc" />
      <path d={`M${cx - 7} 190h14M${cx} 183v14`} stroke="#20302a" strokeWidth="2.5" />
    </g>
  );
}

const TRASH = [
  { x: 208, c: '#f2b01e', d: 0 },
  { x: 222, c: '#e5322d', d: 0.08 },
  { x: 214, c: '#7a5a3a', d: 0.16 },
  { x: 228, c: '#9be07a', d: 0.24 },
  { x: 204, c: '#1f6aa5', d: 0.32 },
  { x: 218, c: '#f2b01e', d: 0.4 },
];

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) onDone();
  }, []);

  // click or any key skips straight to the dashboard
  useEffect(() => {
    const skip = () => setLeaving(true);
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, []);

  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.animationName.startsWith('sp-fade')) onDone();
  };

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-label="Loading dashboard" onClick={() => setLeaving(true)} onAnimationEnd={onAnimationEnd}>
      <svg className="splash-art" viewBox="0 -40 600 280" aria-hidden="true">
        {/* sidewalk + road */}
        <rect x="0" y="166" width="600" height="12" fill="#cfe3c8" />
        <rect x="0" y="178" width="600" height="62" fill="#5d6b63" />
        <path d="M0 214h600" stroke="#f3faf2" strokeWidth="3" strokeDasharray="22 18" className="sp-lane" />

        {/* bin on the sidewalk */}
        <g className="sp-bin">
          <rect x="110" y="116" width="40" height="56" rx="3" fill="#1f6aa5" />
          <rect x="106" y="110" width="48" height="7" rx="2" fill="#20402c" />
          <path d="M122 134l8-8 8 8M122 150l8 8 8-8" stroke="#fff" strokeWidth="2.4" fill="none" />
        </g>

        {/* trash falling into the hopper */}
        {TRASH.map((t, i) => (
          <rect key={i} className="sp-trash" x={t.x} y={92} width="8" height="8" rx="2" fill={t.c} style={{ animationDelay: `${1.55 + t.d}s` }} />
        ))}

        {/* garbage truck, facing right */}
        <g className="sp-truck">
          <g className="sp-puff">
            <circle cx="150" cy="178" r="8" fill="#c9d4cc" />
            <circle cx="138" cy="170" r="11" fill="#dfe7e1" />
          </g>
          <rect x="165" y="176" width="198" height="10" rx="2" fill="#20402c" />
          <rect x="170" y="118" width="130" height="62" rx="6" fill="#1f7a3a" />
          <rect x="170" y="118" width="130" height="8" rx="3" fill="#145c2b" />
          <path d="M226 140l9-9 9 9M226 162l9 9 9-9M216 151h38" stroke="#e9f5ea" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M300 180v-40c0-4 3-7 7-7h30c6 0 10 3 13 8l12 20v19z" fill="#2e9e4a" />
          <path d="M314 140h22c3 0 5 1 7 4l8 14h-37z" fill="#cfeaf5" />
          <rect x="356" y="168" width="8" height="5" rx="1" fill="#f2b01e" />
          <Wheel cx={205} />
          <Wheel cx={330} />
        </g>
      </svg>
      <div className="splash-text">
        <h1>Street View</h1>
        <p>Optimizing collection routes…</p>
      </div>
    </div>
  );
}
