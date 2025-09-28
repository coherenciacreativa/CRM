import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

/**
 * CRM Ops Dashboard — Next.js page (pages/ops/index.tsx)
 *
 * Uses existing endpoints:
 *   - GET /api/healthz
 *   - GET /api/ops/heartbeat
 *   - GET /api/stats/daily
 *   - GET /api/reprocess-events   (optional: x-api-token)
 *
 * Env (optional):
 *   - NEXT_PUBLIC_API_TOKEN        -> if set, "Reprocess now" sends it as x-api-token
 *   - NEXT_PUBLIC_DASHBOARD_TOKEN  -> if set, page requires ?token=... to view
 */

const API_BASE = "";

async function fetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function fmtDate(d?: string | number | Date) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString();
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface Health {
  ok: boolean;
  supabase_ok: boolean;
  mailerlite_key_present: boolean;
  ml_groups_count?: number;
  ts: string;
}
interface HeartbeatRow {
  id: number;
  source: string;
  action: string;
  level: string;
  data?: { processed?: number; failed?: number; checked?: number; max?: number };
  created_at: string;
}
interface DebugItem {
  id: number;
  provider?: string;
  contact_id?: string;
  message_id?: string | null;
  extracted_email?: string | null;
  status: "NEW" | "PROCESSED" | "FAILED";
  attempt_count?: number;
  permanent_failed?: boolean;
  created_at: string;
}

export default function OpsDashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [heartbeat, setHeartbeat] = useState<HeartbeatRow | null>(null);
  const [latest, setLatest] = useState<DebugItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const apiToken = process.env.NEXT_PUBLIC_API_TOKEN || "";
  const guardToken = process.env.NEXT_PUBLIC_DASHBOARD_TOKEN || "";
  const [allowed, setAllowed] = useState<boolean>(!guardToken);

  useEffect(() => {
    if (!guardToken) return;
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("token") || "";
      setAllowed(t === guardToken);
    } catch {
      setAllowed(false);
    }
  }, [guardToken]);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [h, hb, s] = await Promise.all([
        fetchJSON<Health>("/api/healthz"),
        fetchJSON<{ ok: boolean; last: HeartbeatRow | null }>("/api/ops/heartbeat").catch(() => ({
          ok: false,
          last: null,
        })),
        fetchJSON<{ ok: boolean; latest: DebugItem[] }>("/api/stats/daily").catch(() => ({
          ok: false,
          latest: [],
        })),
      ]);
      setHealth(h);
      setHeartbeat(hb?.last || null);
      setLatest(s?.latest || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!auto) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(loadAll, 10000) as unknown as number;
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [auto]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return latest;
    return latest.filter((it) => (it.extracted_email || "").toLowerCase().includes(q));
  }, [query, latest]);

  const stats = useMemo(() => {
    const count = { total: latest.length, processed: 0, failed: 0, pending: 0, permanent: 0 };
    for (const it of latest) {
      if (it.status === "PROCESSED") count.processed++;
      else if (it.status === "FAILED") count.failed++;
      else count.pending++;
      if (it.permanent_failed) count.permanent++;
    }
    return count;
  }, [latest]);

  async function triggerReprocess() {
    try {
      setLoading(true);
      await fetch("/api/reprocess-events", {
        method: "GET",
        headers: apiToken ? { "x-api-token": apiToken } : undefined,
      });
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["id", "email", "status", "attempts", "permanent_failed", "created_at"],
      ...filtered.map((it) => [
        it.id,
        it.extracted_email || "",
        it.status,
        String(it.attempt_count ?? ""),
        String(!!it.permanent_failed),
        it.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `crm-latest-${Date.now()}.csv`;
    a.click();
  }

  if (!allowed) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>Ops Dashboard</h1>
          <p>Access denied. Missing or invalid token.</p>
          <p>
            Append <code>?token=YOUR_TOKEN</code> to the URL. Set it in <code>NEXT_PUBLIC_DASHBOARD_TOKEN</code>.
          </p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Head>
        <title>CRM Ops Dashboard</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div>
          <h1>CRM Ops Dashboard</h1>
          <p className="muted">Live view of webhook health, reprocess, and latest ingests.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={loadAll} disabled={loading}>
            Refresh
          </button>
          <button className="btn" onClick={() => setAuto((v) => !v)}>
            {auto ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
          </button>
          {apiToken ? (
            <button className="btn primary" onClick={triggerReprocess} disabled={loading}>
              Reprocess now
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="kpis">
        <KPI title="Supabase" ok={!!health?.supabase_ok} subtitle={health?.ok ? "connected" : "—"} />
        <KPI
          title="MailerLite key"
          ok={!!health?.mailerlite_key_present}
          subtitle={health?.mailerlite_key_present ? "present" : "missing"}
        />
        <KPI
          title="ML groups"
          ok={(health?.ml_groups_count || 0) > 0}
          value={String(health?.ml_groups_count ?? "0")}
          subtitle="configured"
        />
        <KPI title="PROCESSED" ok subtitle={`${stats.processed}/${stats.total}`} value={String(stats.processed)} />
        <KPI title="FAILED" ok={stats.failed === 0} value={String(stats.failed)} subtitle={`${stats.permanent} permanent`} />
        <KPI title="PENDING" ok={stats.pending === 0} value={String(stats.pending)} subtitle="NEW" />
      </section>

      <section className="stack">
        <div className="panel">
          <h2>Heartbeat</h2>
          <div className="row">
            <div className="pill">
              last run: <b>{heartbeat ? fmtDate(heartbeat.created_at) : "—"}</b>
            </div>
            <div className="pill">
              processed: <b>{heartbeat?.data?.processed ?? 0}</b>
            </div>
            <div className="pill">
              failed: <b>{heartbeat?.data?.failed ?? 0}</b>
            </div>
            <div className="pill">
              checked: <b>{heartbeat?.data?.checked ?? 0}</b>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Latest ingests</h2>
            <div className="panel-tools">
              <input
                className="input"
                placeholder="filter by email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="btn" onClick={exportCSV} title="Export CSV">
                Export
              </button>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Permanent</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td className="mono">{it.extracted_email || "—"}</td>
                  <td>
                    <span className={cx("badge", it.status.toLowerCase())}>{it.status}</span>
                  </td>
                  <td className="mono">{it.attempt_count ?? 0}</td>
                  <td>{it.permanent_failed ? "yes" : "no"}</td>
                  <td className="mono">{fmtDate(it.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center", padding: "16px" }}>
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="foot">
        <span>Updated: {fmtDate(health?.ts)}</span>
        <span>·</span>
        <a href="/api/healthz" target="_blank" rel="noreferrer">
          /api/healthz
        </a>
        <span>·</span>
        <a href="/api/debug/last?limit=10" target="_blank" rel="noreferrer">
          /api/debug/last
        </a>
        <span>·</span>
        <a href="/api/ops/heartbeat" target="_blank" rel="noreferrer">
          /api/ops/heartbeat
        </a>
      </footer>

      <style jsx>{styles}</style>
    </div>
  );
}

function KPI({ title, value, subtitle, ok }: { title: string; value?: string; subtitle?: string; ok?: boolean }) {
  return (
    <div className={cx("kpi", ok ? "ok" : "")}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value ?? (ok ? "OK" : "—")}</div>
      {subtitle ? <div className="kpi-sub">{subtitle}</div> : null}
    </div>
  );
}

const styles = `
  :global(html, body, #__next) { height: 100%; }
  .wrap { min-height: 100%; background: #0b1020; color: #dfe7ff; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  h1 { font-size: 22px; margin: 0; }
  .muted { color: #9db0d4; }
  .actions { display: flex; gap: 8px; }
  .btn { background: #1b2540; border: 1px solid #2a3a6a; color: #eaf0ff; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-weight: 600; }
  .btn:hover { background: #212d52; }
  .btn[disabled] { opacity: .6; cursor: not-allowed; }
  .btn.primary { background: #2b6ef2; border-color: #2b6ef2; }
  .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { background: linear-gradient(180deg,#141b33,#0e152b); border:1px solid #1c2749; border-radius: 14px; padding: 14px; }
  .kpi.ok { border-color: #2b6ef2; box-shadow: 0 0 0 1px rgba(43,110,242,.25) inset; }
  .kpi-title { color:#9db0d4; font-size: 12px; letter-spacing:.6px; text-transform: uppercase; }
  .kpi-value { font-size: 26px; font-weight: 800; margin-top: 6px; }
  .kpi-sub { color:#9db0d4; font-size: 12px; margin-top: 2px; }
  .stack { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .panel { background: #0e152b; border:1px solid #1c2749; border-radius: 14px; padding: 16px; }
  .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .panel h2 { margin: 0 0 8px; font-size: 16px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .pill { background:#101a34; border:1px solid #243463; border-radius: 999px; padding:6px 10px; color:#bfd0ff; font-size:12px; }
  .input { background:#0b1226; border:1px solid #1c2749; color:#eaf0ff; padding:8px 10px; border-radius:10px; min-width: 220px; }
  .table { width:100%; border-collapse: collapse; }
  .table th, .table td { text-align:left; padding: 10px 8px; border-bottom: 1px dashed #1f2a50; }
  .table thead th { color:#9db0d4; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
  .badge { padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .badge.processed { background:#14381b; color:#7be08f; border:1px solid #1e6b2e; }
  .badge.failed { background:#3a1218; color:#ff9da4; border:1px solid #7b2a34; }
  .badge.new { background:#17233e; color:#8eb6ff; border:1px solid #2b6ef2; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .foot { display:flex; gap:10px; align-items:center; justify-content:flex-end; margin-top: 16px; color:#9db0d4; }
  .alert { background:#3a1218; color:#ffb5bb; border:1px solid #7b2a34; padding:10px 12px; border-radius:12px; margin-bottom:10px; }
  @media (max-width: 1100px){ .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 640px){ .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .actions{ flex-wrap:wrap; } }
`;

// TODO: Add per-row actions (view payload, single reprocess)
// TODO: Include time-series charts for processed/failed events
// TODO: Add filters for date range and status
// TODO: Surface MailerLite group assignments per contact
