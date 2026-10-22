import { IconLeaf } from './Icons';

function Tree({ x, s = 1, dark = false }: { x: number; s?: number; dark?: boolean }) {
  const c1 = dark ? '#3f8f3a' : '#6cbf4f';
  const c2 = dark ? '#2f7a30' : '#58ad43';
  return (
    <g transform={`translate(${x} ${118 - 70 * s}) scale(${s})`}>
      <rect x="-3" y="40" width="6" height="30" fill="#7a5a3a" />
      <circle cx="0" cy="26" r="22" fill={c1} />
      <circle cx="-14" cy="36" r="14" fill={c2} />
      <circle cx="14" cy="34" r="15" fill={c2} />
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`} stroke="#2f4a3a" strokeWidth="3" fill="none">
      <path d="M0 118V40c0-10 6-14 16-14h14" />
      <rect x="28" y="23" width="12" height="7" rx="2" fill="#2f4a3a" />
    </g>
  );
}

function Skyline() {
  const blocks = [
    [640, 60, 26], [668, 40, 22], [692, 74, 30], [724, 52, 20], [746, 86, 28], [776, 46, 24], [802, 70, 26], [830, 38, 22],
  ];
  return (
    <g fill="#bfe0d6" opacity="0.9">
      {blocks.map(([x, h, w]) => (
        <g key={x}>
          <rect x={x} y={118 - h} width={w} height={h} />
          {Array.from({ length: Math.floor(h / 12) }).map((_, i) => (
            <rect key={i} x={x + 5} y={118 - h + 6 + i * 12} width={w - 10} height="3" fill="#a5d2c5" />
          ))}
        </g>
      ))}
    </g>
  );
}

function Bins() {
  const colors = ['#1f6aa5', '#1f6aa5', '#2e8b3e', '#2e8b3e', '#3a9d3a'];
  return (
    <g>
      {colors.map((c, i) => (
        <g key={i} transform={`translate(${470 + i * 30} 88)`}>
          <rect x="0" y="0" width="26" height="4" rx="1.5" fill="#20402c" />
          <rect x="2" y="4" width="22" height="26" rx="2" fill={c} />
          <path d="M9 14l4-4 4 4M9 20l4 4 4-4" stroke="#fff" strokeWidth="1.6" fill="none" />
        </g>
      ))}
    </g>
  );
}

function Truck() {
  return (
    <g transform="translate(880 58)">
      <rect x="40" y="6" width="120" height="50" rx="6" fill="#2e8b3e" />
      <rect x="40" y="6" width="120" height="10" rx="4" fill="#3fa552" />
      <path d="M90 22a10 10 0 1 1-2 14" stroke="#fff" strokeWidth="3" fill="none" />
      <path d="M0 56V24c0-6 4-10 10-10h30v42z" fill="#e9efe9" />
      <rect x="6" y="20" width="26" height="14" rx="2" fill="#9fd0e8" />
      <rect x="0" y="50" width="164" height="8" fill="#20402c" />
      {[22, 110, 140].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="60" r="9" fill="#1d2b22" />
          <circle cx={cx} cy="60" r="4" fill="#c9d3cb" />
        </g>
      ))}
    </g>
  );
}

export function Header() {
  return (
    <header className="banner">
      <svg className="banner-art" viewBox="0 0 1200 140" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f8ee" />
            <stop offset="1" stopColor="#e3f1dc" />
          </linearGradient>
        </defs>
        <rect width="1200" height="140" fill="url(#sky)" />
        <Skyline />
        <Tree x={430} s={1.1} />
        <Tree x={600} s={0.9} dark />
        <Tree x={860} s={1.2} />
        <Tree x={1080} s={1.15} dark />
        <Tree x={1160} s={0.8} />
        <Lamp x={445} />
        <Lamp x={700} />
        <rect y="118" width="1200" height="22" fill="#d5dfd3" />
        <path d="M380 129h820" stroke="#fff" strokeWidth="2" strokeDasharray="18 14" />
        <Bins />
        <Truck />
      </svg>
      <div className="brand">
        <IconLeaf size={64} />
        <div>
          <h1>STREET VIEW</h1>
          <p>AI-Driven Smart Waste Management</p>
        </div>
      </div>
      <div className="tagline" aria-hidden="true">
        Cleaner Streets
        <br />
        Greener Tomorrow
      </div>
    </header>
  );
}
