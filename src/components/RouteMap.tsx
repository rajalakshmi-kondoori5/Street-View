import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { binLevel, binPriority, hasCoords } from '../data/binMapper';
import type { Bin, BinLevel, Depot, RoutePlan } from '../types';
import { fmtKm, fmtMin, fmtPct, fmtTime } from './format';

const LEVEL_COLOR: Record<BinLevel, string> = { Normal: '#2e9e4a', Full: '#f2b01e', Critical: '#e5322d' };

function pinIcon(level: BinLevel, label: string | null): L.DivIcon {
  const color = LEVEL_COLOR[level];
  const html = `
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 43s15-15.6 15-26A15 15 0 0 0 2 17c0 10.4 15 26 15 26z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      ${label ? `<text x="17" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="Poppins,system-ui,sans-serif">${label}</text>` : '<circle cx="17" cy="17" r="5.5" fill="#fff"/>'}
    </svg>`;
  return L.divIcon({ html, className: 'pin', iconSize: [34, 44], iconAnchor: [17, 43], popupAnchor: [0, -38] });
}

const depotIcon = L.divIcon({
  className: 'pin',
  html: `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="#1f7a3a" stroke="#fff" stroke-width="3"/>
    <path d="M11 20 20 12l9 8M14 18v9h4.5v-5h3v5H26v-9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -18],
});

function FitBounds({ points, signature }: { points: [number, number][]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    // Only refit when the set of points changes, so the user's own pan/zoom isn't fought.
  }, [signature]);
  return null;
}

/** Leaflet needs a size recalculation when its container is shown or resized. */
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function RouteMap({ bins, depot, plan, threshold, height = 360 }: { bins: Bin[]; depot: Depot; plan: RoutePlan | null; threshold: number; height?: number }) {
  const order = useMemo(() => new Map(plan?.stops.map((s, i) => [s.binId, i + 1]) ?? []), [plan]);
  const located = bins.filter(hasCoords);
  const points: [number, number][] = [[depot.lat, depot.lng], ...located.map((b) => [b.lat, b.lng] as [number, number])];
  const signature = points.map((p) => p.join(',')).join(';');

  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={[depot.lat, depot.lng]} zoom={14} scrollWheelZoom zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <ZoomControl position="topright" />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} signature={signature} />
        <ResizeFix />

        {plan && plan.geometry.length > 1 && (
          <>
            <Polyline positions={plan.geometry} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={plan.geometry} pathOptions={{ color: '#1f8a3b', weight: 5, opacity: 0.95, dashArray: plan.source === 'estimated' ? '10 8' : undefined }} />
          </>
        )}

        <Marker position={[depot.lat, depot.lng]} icon={depotIcon} zIndexOffset={1000}>
          <Tooltip direction="bottom" offset={[0, 18]} permanent className="map-label">Depot</Tooltip>
          <Popup>
            <b>Depot</b>
            <br />
            {depot.name}
            <br />
            <span className="muted">Route starts and ends here</span>
          </Popup>
        </Marker>

        {located.map((b) => {
          const level = binLevel(b.fillLevel, threshold);
          const stop = order.get(b.binId) ?? null;
          const s = stop ? plan!.stops[stop - 1] : null;
          return (
            <Marker key={String(b.rowId)} position={[b.lat, b.lng]} icon={pinIcon(level, stop ? String(stop) : null)} zIndexOffset={stop ? 500 : 0}>
              <Popup>
                <b>{b.binId}</b> — {level}
                <br />
                {b.address}
                <br />
                Fill level: <b>{fmtPct(b.fillLevel)}</b> · Priority: {binPriority(b.fillLevel, threshold)}
                <br />
                Last updated: {fmtTime(b.lastUpdated)}
                {s && (
                  <>
                    <br />
                    <b>Stop {stop}</b> · arrives ~{fmtMin(s.arrivalMin)} · leg {fmtKm(s.legKm)}
                  </>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="map-legend">
        <div><span className="lg-depot" /> Depot</div>
        <div><span className="lg-pin" style={{ background: LEVEL_COLOR.Normal }} /> Bin (Normal)</div>
        <div><span className="lg-pin" style={{ background: LEVEL_COLOR.Full }} /> Bin (Full)</div>
        <div><span className="lg-pin" style={{ background: LEVEL_COLOR.Critical }} /> Bin (Critical)</div>
        <div><span className={`lg-line ${plan?.source === 'estimated' ? 'dashed' : ''}`} /> {plan?.source === 'estimated' ? 'Estimated route' : 'Optimized route'}</div>
      </div>
    </div>
  );
}
