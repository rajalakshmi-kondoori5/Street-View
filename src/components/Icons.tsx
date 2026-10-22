import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}><path d="M3 11 12 3l9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Svg>
);
export const IconBin = (p: P) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></Svg>
);
export const IconMap = (p: P) => (
  <Svg {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></Svg>
);
export const IconBell = (p: P) => (
  <Svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>
);
export const IconWarn = (p: P) => (
  <Svg {...p}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></Svg>
);
export const IconSiren = (p: P) => (
  <Svg {...p}><path d="M7 18v-6a5 5 0 0 1 10 0v6" /><path d="M5 18h14v3H5z" /><path d="M12 3V1M4.2 6.2 2.8 4.8M19.8 6.2l1.4-1.4M1 12h2M21 12h2" /></Svg>
);
export const IconRoute = (p: P) => (
  <Svg {...p}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16" /></Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconTrend = (p: P) => (
  <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}><path d="M12 22s7-7.4 7-13a7 7 0 1 0-14 0c0 5.6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></Svg>
);
export const IconWifi = (p: P) => (
  <Svg {...p}><path d="M2 8.8a15 15 0 0 1 20 0" /><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M12 19.5h.01" /></Svg>
);
export const IconFlask = (p: P) => (
  <Svg {...p}><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7 15h10" /></Svg>
);
export const IconRefresh = (p: P) => (
  <Svg {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></Svg>
);
export const IconPlay = (p: P) => (
  <Svg {...p}><path d="m7 4 13 8-13 8V4z" /></Svg>
);
export const IconPause = (p: P) => (
  <Svg {...p}><path d="M7 4v16M17 4v16" /></Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconTruck = (p: P) => (
  <Svg {...p}><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></Svg>
);
export const IconLeaf = ({ size = 40, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" {...p}>
    <path d="M56 6C32 6 15 18 12 42c9-15 21-23 36-26C37 23 25 34 19 55 46 51 59 32 56 6z" fill="#2e9e4a" />
    <path d="M30 30C21 34 11 44 8 58c3-2 5-4 7-7 3-10 9-17 15-21z" fill="#1f6d33" />
  </svg>
);
