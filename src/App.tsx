import { useEffect, useState } from 'react';
import { Analytics } from './components/Analytics';
import { AlertsView, RecentAlerts, Toasts } from './components/AlertsPanel';
import { BinTable, TestControls } from './components/BinTable';
import { Header } from './components/Header';
import { IconMap } from './components/Icons';
import { BinKpis, RouteKpis } from './components/KpiCards';
import { RouteMap } from './components/RouteMap';
import { CollectionOrder, RouteStatus, RouteSummary, RouteWarnings } from './components/RoutePanels';
import { Settings } from './components/Settings';
import { Sidebar, type View } from './components/Sidebar';
import { Splash } from './components/Splash';
import { Toolbar } from './components/Toolbar';
import { config, isSupabaseConfigured } from './config';
import { useAlerts } from './hooks/useAlerts';
import { useBins } from './hooks/useBins';
import { useOptimizedRoute } from './hooks/useOptimizedRoute';
import { usePersistentState } from './hooks/usePersistentState';
import type { DataMode, Depot } from './types';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = usePersistentState<DataMode>('sv.mode', config.defaultMode);
  const [threshold, setThreshold] = usePersistentState<number>('sv.threshold', config.fillThreshold);
  const [depot, setDepot] = usePersistentState<Depot>('sv.depot', config.depot);
  const [useRoad, setUseRoad] = usePersistentState<boolean>('sv.road', true);
  const [showSplash, setShowSplash] = useState(true);

  const data = useBins(mode, threshold);
  const alerts = useAlerts(data.bins, threshold, data.ready, mode);
  const route = useOptimizedRoute(data.bins, depot, threshold, useRoad, data.ready);

  // re-render every 15 s so "x min ago" labels stay current
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (view === 'alerts') alerts.markAllRead();
  }, [view, alerts.alerts.length]);

  const routeProps = { plan: route.plan, computing: route.computing, error: route.error, threshold, onRecompute: route.recompute };

  const mapCard = (height: number) => (
    <section className="card">
      <div className="card-head">
        <h2><IconMap size={22} /> Optimized Collection Route</h2>
        <RouteStatus {...routeProps} />
      </div>
      <RouteMap bins={data.bins} depot={depot} plan={route.plan} threshold={threshold} height={height} />
      <RouteWarnings plan={route.plan} />
    </section>
  );

  return (
    <div className="app">
      <Header />
      <div className="body">
        <Sidebar view={view} onNavigate={setView} unread={alerts.unread} />
        <main className="main">
          <Toolbar
            mode={mode}
            onMode={setMode}
            connection={data.connection}
            lastSyncAt={data.lastSyncAt}
            onRefresh={data.refresh}
            threshold={threshold}
            onThreshold={setThreshold}
            depot={depot}
            onDepot={setDepot}
          />

          {mode === 'live' && !isSupabaseConfigured && (
            <div className="banner-msg error">
              LIVE MODE needs Supabase credentials. Copy <span className="mono">.env.example</span> to <span className="mono">.env</span>, set{' '}
              <span className="mono">VITE_SUPABASE_URL</span> and <span className="mono">VITE_SUPABASE_ANON_KEY</span> (the public anon key), then restart{' '}
              <span className="mono">npm run dev</span>.
            </div>
          )}
          {data.error && isSupabaseConfigured && <div className="banner-msg error">Could not load bins: {data.error}</div>}
          {mode === 'live' && data.loading && <div className="banner-msg">Loading bins from Supabase…</div>}
          {mode === 'live' && data.ready && data.bins.length === 0 && (
            <div className="banner-msg">The <span className="mono">bins</span> table is empty (or the SELECT policy hides all rows).</div>
          )}

          {view === 'dashboard' && (
            <>
              <BinKpis bins={data.bins} threshold={threshold} />
              <RouteKpis plan={route.plan} computing={route.computing} />
              {data.test && <TestControls test={data.test} />}
              <div className="grid-main">
                <div className="stack">
                  <RecentAlerts alerts={alerts.alerts} onViewAll={() => setView('alerts')} />
                  <BinTable bins={data.bins} threshold={threshold} test={data.test} compact />
                </div>
                <div className="stack">
                  {mapCard(340)}
                  <div className="grid-2">
                    <RouteSummary {...routeProps} />
                    <CollectionOrder {...routeProps} />
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'bins' && (
            <>
              <BinKpis bins={data.bins} threshold={threshold} />
              <BinTable bins={data.bins} threshold={threshold} test={data.test} title="All Bins" />
            </>
          )}

          {view === 'map' && (
            <>
              <RouteKpis plan={route.plan} computing={route.computing} />
              {mapCard(560)}
              <div className="grid-2">
                <RouteSummary {...routeProps} />
                <CollectionOrder {...routeProps} />
              </div>
            </>
          )}

          {view === 'alerts' && <AlertsView alerts={alerts.alerts} onMarkAllRead={alerts.markAllRead} onClear={alerts.clear} />}

          {view === 'analytics' && <Analytics bins={data.bins} threshold={threshold} plan={route.plan} />}

          {view === 'settings' && (
            <Settings
              mode={mode}
              connection={data.connection}
              threshold={threshold}
              onThreshold={setThreshold}
              depot={depot}
              onDepot={setDepot}
              useRoadRouting={useRoad}
              onRoadRouting={setUseRoad}
            />
          )}
        </main>
      </div>
      <Toasts toasts={alerts.toasts} onDismiss={alerts.dismissToast} />
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
    </div>
  );
}
