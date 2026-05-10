import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  buildCrmVNextSourceLedger,
  type CrmVNextSourceLedger,
  type CrmVNextSourceLedgerEntry,
} from '../../lib/crm/crm-vnext-source-ledger';

type SourcesPageProps =
  | {
      enabled: true;
      ledger: CrmVNextSourceLedger;
    }
  | {
      enabled: false;
      error: string;
    };

const numberFmt = new Intl.NumberFormat('es-CO');

const isLocalHost = (host: string | undefined): boolean => {
  if (!host) return false;
  return (
    host === 'localhost'
    || host.startsWith('localhost:')
    || host === '127.0.0.1'
    || host.startsWith('127.0.0.1:')
    || host === '[::1]'
    || host.startsWith('[::1]:')
  );
};

const label = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getServerSideProps: GetServerSideProps<SourcesPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext sources are disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const expectedMailerLiteContacts = context.query.expectedMailerLiteContacts
      ? Number.parseInt(String(context.query.expectedMailerLiteContacts), 10)
      : null;
    return {
      props: {
        enabled: true,
        ledger: await buildCrmVNextSourceLedger({
          expectedMailerLiteContacts: Number.isFinite(expectedMailerLiteContacts)
            ? expectedMailerLiteContacts
            : null,
        }),
      },
    };
  } catch (error) {
    console.error('crm-vnext sources page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load CRM vNext source ledger.',
      },
    };
  }
};

function SourceCard({ source }: { source: CrmVNextSourceLedgerEntry }) {
  return (
    <article className="sourceCard">
      <div className="sourceHeader">
        <div>
          <h2>{source.title}</h2>
          <p>{source.note}</p>
        </div>
        <span className={`badge ${source.freshness}`}>{label(source.freshness)}</span>
      </div>
      <div className="sourceMeta">
        <div>
          <span>Records</span>
          <strong>{source.recordCount == null ? '—' : numberFmt.format(source.recordCount)}</strong>
        </div>
        <div>
          <span>Trust</span>
          <strong>{label(source.trust)}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{label(source.mode)}</strong>
        </div>
        <div>
          <span>Generated</span>
          <strong>{source.generatedAt || 'unknown'}</strong>
        </div>
      </div>
      {Object.keys(source.metrics).length ? (
        <div className="metricRows">
          {Object.entries(source.metrics).map(([key, value]) => (
            <div className="metricRow" key={key}>
              <span>{label(key)}</span>
              <b>{String(value ?? '—')}</b>
            </div>
          ))}
        </div>
      ) : null}
      {source.operatorAction ? <p className="action">{source.operatorAction}</p> : null}
    </article>
  );
}

export default function CrmVNextSourcesPage(props: SourcesPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Sources</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <section className="emptyState">
          <Link href="/crm-vnext">Back to dashboard</Link>
          <h1>CRM vNext</h1>
          <p>{props.error}</p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const { ledger } = props;
  const totals = {
    sources: ledger.sources.length,
    gaps: ledger.gaps.length,
    usable: ledger.sources.filter((source) => source.canAutoIngest).length,
  };

  return (
    <main className="page">
      <Head>
        <title>Source Ledger - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Source Ledger</h1>
        </div>
        <div className="source">
          <span className={`status ${ledger.status}`}>{label(ledger.status)}</span>
          <small>{ledger.generatedAt}</small>
        </div>
      </header>

      <section className="summary">
        <div>
          <span>Sources</span>
          <strong>{totals.sources}</strong>
        </div>
        <div>
          <span>Usable</span>
          <strong>{totals.usable}</strong>
        </div>
        <div>
          <span>Gaps</span>
          <strong>{totals.gaps}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>Read-only</strong>
        </div>
      </section>

      {ledger.gaps.length ? (
        <section className="gaps">
          {ledger.gaps.map((gap) => (
            <article className={`gap ${gap.level}`} key={gap.id}>
              <span>{label(gap.level)}</span>
              <strong>{gap.title}</strong>
              <p>{gap.detail}</p>
              <small>{gap.operatorAction}</small>
            </article>
          ))}
        </section>
      ) : null}

      <section className="sourceGrid">
        {ledger.sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  :global(body) {
    margin: 0;
    background: #f5f3ee;
    color: #151915;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page {
    min-height: 100vh;
    padding: 32px;
  }

  .hero,
  .summary,
  .gaps,
  .sourceGrid {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 24px;
  }

  .backLink,
  .emptyState a {
    color: #253f2b;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink:hover,
  .emptyState a:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .eyebrow {
    margin: 0 0 6px;
    color: #5d6f61;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1;
    letter-spacing: 0;
  }

  h2 {
    font-size: 18px;
    line-height: 1.2;
  }

  .source {
    display: grid;
    justify-items: end;
    gap: 8px;
    color: #596158;
    font-size: 13px;
  }

  .status,
  .badge {
    border: 1px solid #cad2c5;
    border-radius: 999px;
    padding: 6px 10px;
    color: #253f2b;
    background: #ffffff;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .status.ready,
  .badge.fresh {
    border-color: #99b39b;
    background: #e9f1e4;
  }

  .status.watch,
  .badge.watch,
  .badge.stale,
  .badge.unknown {
    border-color: #d4bd79;
    background: #fff7da;
  }

  .status.blocked,
  .badge.blocked,
  .badge.missing {
    border-color: #d89d91;
    background: #ffe9e4;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .summary div,
  .sourceCard,
  .gap,
  .emptyState {
    border: 1px solid #dde0d6;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.82);
  }

  .summary div {
    display: grid;
    gap: 8px;
    padding: 16px;
  }

  .summary span,
  .sourceMeta span,
  .metricRow span {
    color: #627064;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
  }

  .gaps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .gap {
    display: grid;
    gap: 8px;
    padding: 16px;
  }

  .gap span {
    width: fit-content;
    border-radius: 999px;
    padding: 4px 8px;
    background: #fff7da;
    color: #6d521a;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gap.blocked span {
    background: #ffe9e4;
    color: #743426;
  }

  .gap p,
  .gap small,
  .sourceCard p,
  .action {
    color: #586157;
    line-height: 1.45;
  }

  .sourceGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 14px;
  }

  .sourceCard {
    display: grid;
    gap: 16px;
    padding: 18px;
  }

  .sourceHeader {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .sourceHeader div {
    display: grid;
    gap: 8px;
  }

  .sourceMeta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .sourceMeta div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .sourceMeta strong {
    overflow-wrap: anywhere;
  }

  .metricRows {
    display: grid;
    gap: 8px;
  }

  .metricRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #eceee7;
    padding-top: 8px;
  }

  .metricRow b {
    overflow-wrap: anywhere;
    text-align: right;
  }

  .action {
    border-left: 3px solid #d4bd79;
    padding-left: 12px;
    font-weight: 700;
  }

  .emptyState {
    max-width: 720px;
    margin: 80px auto;
    padding: 24px;
  }

  @media (max-width: 760px) {
    .page {
      padding: 20px;
    }

    .hero {
      align-items: flex-start;
      flex-direction: column;
    }

    .source {
      justify-items: start;
    }

    .summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sourceGrid {
      grid-template-columns: 1fr;
    }
  }
`;
