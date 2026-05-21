import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

type EngagementMovementQueue = {
  source: Record<string, any>;
  summary: Record<string, any>;
  rows: Array<Record<string, any>>;
  unmatchedRows: Array<Record<string, any>>;
};

type EngagementMovementPageProps =
  | {
      enabled: true;
      queue: EngagementMovementQueue;
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

const signed = (value: number): string => {
  if (value > 0) return `+${value}`;
  return String(value);
};

const sourceLabel = (value: string): string =>
  String(value || 'unknown')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identity = (row: EngagementMovementQueue['rows'][number]): string =>
  row.displayName || row.card?.displayName || row.card?.identities.email || row.card?.identities.instagramHandle || row.personId;

export const getServerSideProps: GetServerSideProps<EngagementMovementPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext engagement movement is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const { buildCrmVNextEngagementMovementQueue } = await import(
      '../../lib/crm/crm-vnext-engagement-movement-queue'
    );

    return {
      props: {
        enabled: true,
        queue: await buildCrmVNextEngagementMovementQueue({
          limit: 40,
          snapshotLimit: 5,
          movementLimit: 100,
          includeUnchanged: context.query.includeUnchanged === '1',
        }),
      },
    };
  } catch (error) {
    console.error('crm-vnext engagement movement page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local engagement movement queue.',
      },
    };
  }
};

function SummaryCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'neutral' | 'good' | 'warn' | 'strong';
}) {
  return (
    <div className={`summaryCard ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function CrmVNextEngagementMovementPage(props: EngagementMovementPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>Engagement Movement - CRM vNext</title>
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

  const { queue } = props;

  return (
    <main className="page">
      <Head>
        <title>Engagement Movement - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <Link className="backLink secondary" href="/crm-vnext/queues">Mantis Queues</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Engagement Movement</h1>
        </div>
        <div className="source">
          <span>{numberFmt.format(queue.source.totalSignals)} signals</span>
          <small>{queue.source.latestCapturedAt || 'no snapshot yet'}</small>
        </div>
      </header>

      <section className="summary">
        <SummaryCard label="Rows" value={numberFmt.format(queue.summary.rows)} detail="movement rows" tone="strong" />
        <SummaryCard label="Warmed" value={numberFmt.format(queue.summary.warmedRows)} detail="recent score movement" tone="good" />
        <SummaryCard
          label="Review"
          value={numberFmt.format(queue.summary.reviewRows)}
          detail="needs identity or human review"
          tone={queue.summary.reviewRows ? 'warn' : 'neutral'}
        />
        <SummaryCard label="Snapshots" value={numberFmt.format(queue.source.snapshots)} detail="stored movement history" />
      </section>

      <section className="movementTable">
        {queue.rows.length ? (
          queue.rows.map((row) => (
            <article className="movementRow" key={row.rowId}>
              <div className="identityBlock">
                <Link href={`/crm-vnext/person/${encodeURIComponent(row.personId || '')}`}>
                  <h2>{identity(row)}</h2>
                </Link>
                <p>
                  {row.personId} · {sourceLabel(row.sourceFamily)}
                </p>
              </div>
              <div className={`delta ${row.delta.priorityScore > 0 ? 'up' : row.delta.priorityScore < 0 ? 'down' : ''}`}>
                <strong>{signed(row.delta.priorityScore)}</strong>
                <small>{row.before.priorityScore} → {row.after.priorityScore}</small>
              </div>
              <div className="signalBlock">
                <b>{row.signals.email.label}</b>
                {row.signals.instagram.label ? <span>{row.signals.instagram.label}</span> : null}
                {row.reasonCodes.length ? <small>{row.reasonCodes.map(sourceLabel).join(' · ')}</small> : null}
              </div>
              <div className={`action ${row.operatorAction.reviewRequired ? 'review' : ''}`}>
                <b>{row.operatorAction.label}</b>
                <span>{row.operatorAction.reason}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">No saved engagement movement rows yet.</p>
        )}
      </section>

      {queue.unmatchedRows.length ? (
        <section className="unmatched">
          <div className="sectionHeader">
            <h2>Unmatched Signals</h2>
            <span>{queue.unmatchedRows.length}</span>
          </div>
          {queue.unmatchedRows.map((row) => (
            <article className="unmatchedRow" key={row.rowId}>
              <div>
                <strong>{row.email || row.instagramHandle || row.phone || row.sourceKind}</strong>
                <p>{row.reason}</p>
              </div>
              <span>{row.safeNextStep}</span>
            </article>
          ))}
        </section>
      ) : null}

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
    background: #f5f3ee;
    color: #151915;
  }

  .hero,
  .summary,
  .movementTable,
  .unmatched {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .backLink,
  .identityBlock a,
  .emptyState a {
    color: #253f2b;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink {
    display: inline-block;
    margin: 0 12px 14px 0;
    font-size: 14px;
  }

  .backLink.secondary {
    color: #60745f;
  }

  .backLink:hover,
  .identityBlock a:hover,
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
    font-size: 17px;
    line-height: 1.2;
  }

  .source {
    display: grid;
    gap: 4px;
    text-align: right;
    color: #4b4f49;
  }

  .source span {
    font-weight: 800;
  }

  .source small {
    font-size: 12px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .summaryCard,
  .movementRow,
  .unmatched,
  .empty,
  .emptyState {
    border: 1px solid #ded8cc;
    background: #fffdfa;
    border-radius: 8px;
  }

  .summaryCard {
    min-height: 88px;
    padding: 14px;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .summaryCard span,
  .summaryCard small,
  .source,
  .identityBlock p,
  .signalBlock span,
  .signalBlock small,
  .action span,
  .unmatchedRow p,
  .unmatchedRow span,
  .empty {
    color: #666b62;
  }

  .summaryCard strong {
    font-size: 30px;
    line-height: 1;
  }

  .summaryCard.strong {
    border-color: #3c5441;
    background: #eef4ed;
  }

  .summaryCard.good {
    border-color: #96b899;
  }

  .summaryCard.warn {
    border-color: #d8ad72;
    background: #fff8ec;
  }

  .movementTable {
    display: grid;
    gap: 10px;
  }

  .movementRow {
    display: grid;
    grid-template-columns: minmax(180px, 1.25fr) 92px minmax(220px, 1.4fr) minmax(220px, 1.2fr);
    gap: 14px;
    align-items: center;
    padding: 14px;
  }

  .identityBlock,
  .signalBlock,
  .action {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .identityBlock h2,
  .identityBlock p,
  .signalBlock b,
  .signalBlock span,
  .signalBlock small,
  .action b,
  .action span {
    overflow-wrap: anywhere;
  }

  .delta {
    min-height: 70px;
    border: 1px solid #eee8dd;
    border-radius: 8px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    background: #f8f5ef;
  }

  .delta strong {
    font-size: 28px;
    line-height: 1;
  }

  .delta.up {
    border-color: #95b68e;
    background: #eef6ec;
    color: #253f2b;
  }

  .delta.down {
    border-color: #d8ad72;
    background: #fff8ec;
  }

  .action {
    border-left: 3px solid #c8cfbf;
    padding-left: 12px;
  }

  .action.review {
    border-left-color: #c28743;
  }

  .unmatched {
    margin-top: 12px;
    padding: 18px;
    display: grid;
    gap: 10px;
  }

  .sectionHeader,
  .unmatchedRow {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .sectionHeader span {
    color: #74796f;
    font-size: 13px;
  }

  .unmatchedRow {
    padding: 12px;
    border: 1px solid #eee8dd;
    border-radius: 8px;
    background: #fffefa;
  }

  .empty,
  .emptyState {
    padding: 18px;
  }

  .emptyState {
    max-width: 720px;
    margin: 96px auto;
    display: grid;
    gap: 12px;
  }

  @media (max-width: 980px) {
    .page {
      padding: 20px;
    }

    .hero {
      display: grid;
      align-items: start;
    }

    .source {
      text-align: left;
    }

    .summary,
    .movementRow {
      grid-template-columns: 1fr;
    }

    .delta {
      justify-items: start;
      padding: 12px;
      place-items: start;
    }

    .unmatchedRow,
    .sectionHeader {
      display: grid;
    }
  }
`;
