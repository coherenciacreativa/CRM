import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  loadPersonCardsVNextInsights,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../lib/crm/community-insights-source';
import type {
  CommunityInsightsSummary,
  CommunityPriorityPerson,
} from '../../lib/crm/community-insights';
import {
  readCrmEngagementSnapshotLedger,
} from '../../lib/crm/crm-vnext-engagement-snapshot-ledger';

type EngagementSnapshotLedger = Awaited<ReturnType<typeof readCrmEngagementSnapshotLedger>>;

type DashboardProps =
  | {
      enabled: true;
      source: PublicPersonCardsVNextSource;
      summary: CommunityInsightsSummary;
      engagementLedger: EngagementSnapshotLedger;
    }
  | {
      enabled: false;
      error: string;
    };

const numberFmt = new Intl.NumberFormat('es-CO');

const pct = (value: number, total: number): string => {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const labelAction = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const primaryIdentity = (person: CommunityPriorityPerson): string => {
  if (person.displayName) return person.displayName;
  return person.personId;
};

const signed = (value: number): string => {
  if (value > 0) return `+${value}`;
  return String(value);
};

const stageOrder: Array<keyof CommunityInsightsSummary['lifecycle']> = [
  'SEMILLA',
  'GERMINADA',
  'FLORECIDA',
  'COSECHA',
];

const stageLabels: Record<keyof CommunityInsightsSummary['lifecycle'], string> = {
  SEMILLA: 'Semilla',
  GERMINADA: 'Germinada',
  FLORECIDA: 'Florecida',
  COSECHA: 'Cosecha',
};

function Metric({
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
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="barRow">
      <div className="barMeta">
        <span>{label}</span>
        <b>{numberFmt.format(value)}</b>
      </div>
      <div className="barTrack" aria-hidden="true">
        <div className="barFill" style={{ width: pct(value, total) }} />
      </div>
    </div>
  );
}

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

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext dashboard is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const [payload, engagementLedger] = await Promise.all([
      loadPersonCardsVNextInsights({ topLimit: 12 }),
      readCrmEngagementSnapshotLedger(undefined, { limit: 5, movementLimit: 8 }),
    ]);
    return {
      props: {
        enabled: true,
        source: publicPersonCardsVNextSource(payload.source),
        summary: payload.summary,
        engagementLedger,
      },
    };
  } catch (error) {
    console.error('crm-vnext dashboard load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext insights.',
      },
    };
  }
};

export default function CrmVNextDashboard(props: DashboardProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <section className="emptyState">
          <h1>CRM vNext</h1>
          <p>{props.error}</p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const { summary, source, engagementLedger } = props;
  const total = summary.totals.cards;
  const topActions = Object.entries(summary.nextActions)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);

  return (
    <main className="page">
      <Head>
        <title>CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <p className="eyebrow">CRM vNext</p>
          <h1>Community Command Center</h1>
        </div>
        <div className="source">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>Snapshot: {source.generatedAt || 'unknown'}</small>
          <Link className="navLink" href="/crm-vnext/daily-brief">Daily Brief</Link>
          <Link className="navLink" href="/crm-vnext/queues">Mantis Queues</Link>
          <Link className="navLink" href="/crm-vnext/engagement-movement">Engagement Movement</Link>
          <Link className="navLink" href="/crm-vnext/people">People Explorer</Link>
          <Link className="navLink" href="/crm-vnext/sources">Source Ledger</Link>
          <Link className="navLink" href="/crm-vnext/fact-intake">Fact Intake</Link>
          <Link className="navLink" href="/crm-vnext/fact-store">Fact Store</Link>
          <Link className="navLink" href="/crm-vnext/identity-review">Identity Review</Link>
          <Link className="navLink" href="/crm-vnext/card-rebuild-diff">Card Diff</Link>
          <Link className="navLink" href="/crm-vnext/activation-run">Activation Run</Link>
          <Link className="navLink" href="/crm-vnext/identity-stitching-research">Stitching Research</Link>
          <Link className="navLink" href="/crm-vnext/deep-local-stitching">Deep Stitching</Link>
          <Link className="navLink" href="/crm-vnext/multi-service-card-proposal">Card Proposal</Link>
          <Link className="navLink" href="/crm-vnext/evidence-approval-workbench">Approval Workbench</Link>
        </div>
      </header>

      <section className="metrics" aria-label="Community totals">
        <Metric label="People" value={numberFmt.format(total)} detail="local person cards" tone="strong" />
        <Metric
          label="Email"
          value={numberFmt.format(summary.totals.emailPresent)}
          detail={pct(summary.totals.emailPresent, total)}
          tone="good"
        />
        <Metric
          label="Instagram"
          value={numberFmt.format(summary.totals.instagramPresent)}
          detail={pct(summary.totals.instagramPresent, total)}
          tone="warn"
        />
        <Metric
          label="Omnichannel"
          value={numberFmt.format(summary.totals.omnichannel)}
          detail={pct(summary.totals.omnichannel, total)}
          tone="neutral"
        />
      </section>

      <section className="panel wide engagementPanel">
        <div className="panelHeader">
          <h2>Engagement Movement</h2>
          <span>{engagementLedger.summary.snapshots} snapshots</span>
        </div>
        <div className="movementSummary" aria-label="Engagement snapshot totals">
          <Metric
            label="Signals"
            value={numberFmt.format(engagementLedger.summary.totalSignals)}
            detail={`${numberFmt.format(engagementLedger.summary.totalMatchedSignals)} matched`}
            tone="neutral"
          />
          <Metric
            label="Warmed"
            value={numberFmt.format(engagementLedger.summary.totalWarmedCards)}
            detail="preview history"
            tone="good"
          />
          <Metric
            label="Review"
            value={numberFmt.format(engagementLedger.summary.totalHumanFollowUpReview)}
            detail="human follow-up"
            tone={engagementLedger.summary.totalHumanFollowUpReview ? 'warn' : 'neutral'}
          />
          <Metric
            label="Latest"
            value={engagementLedger.summary.latestCapturedAt ? 'saved' : 'empty'}
            detail={engagementLedger.summary.latestCapturedAt || 'no snapshot yet'}
            tone={engagementLedger.summary.latestCapturedAt ? 'strong' : 'neutral'}
          />
        </div>
        {engagementLedger.latestMovements.length ? (
          <div className="movementList">
            {engagementLedger.latestMovements.slice(0, 6).map((movement) => (
              <div className="movementRow" key={`${movement.snapshotRecordId}:${movement.movementItemId}`}>
                <div>
                  <Link className="personLink" href={`/crm-vnext/person/${encodeURIComponent(movement.personId || '')}`}>
                    <span className="identity">{movement.displayName || movement.personId}</span>
                  </Link>
                  <small>
                    {movement.match.sourceKinds.join(', ') || 'engagement'} · {labelAction(movement.recommendedQueue)}
                  </small>
                </div>
                <div className={`deltaBox ${movement.delta.priorityScore > 0 ? 'up' : movement.delta.priorityScore < 0 ? 'down' : ''}`}>
                  <b>{signed(movement.delta.priorityScore)}</b>
                  <small>priority</small>
                </div>
                <div className="scorePair">
                  <span>{movement.after.priorityScore}</span>
                  <small>now</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="emptyNote">No saved engagement snapshots yet. Run the ledger command after a read-only engagement preview.</p>
        )}
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Lifecycle</h2>
            <span>{numberFmt.format(total)} total</span>
          </div>
          <div className="bars">
            {stageOrder.map((stage) => (
              <Bar key={stage} label={stageLabels[stage]} value={summary.lifecycle[stage]} total={total} />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Identity Gaps</h2>
            <span>enrichment queue</span>
          </div>
          <div className="gapList">
            <Metric
              label="IG without email"
              value={summary.identityGaps.missingEmailWithInstagram}
              detail="ask for email"
              tone="warn"
            />
            <Metric
              label="Email without IG"
              value={summary.identityGaps.missingInstagramWithEmail}
              detail="stitching opportunity"
              tone="neutral"
            />
            <Metric
              label="Low confidence"
              value={summary.identityGaps.lowDataConfidence}
              detail="needs evidence"
              tone={summary.identityGaps.lowDataConfidence ? 'warn' : 'good'}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Next Actions</h2>
            <span>Mantis queues</span>
          </div>
          <div className="actionList">
            {topActions.map(([action, count]) => (
              <div className="actionRow" key={action}>
                <span>{labelAction(action)}</span>
                <b>{numberFmt.format(count)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Averages</h2>
            <span>0-100</span>
          </div>
          <div className="avgGrid">
            <Metric label="Priority" value={summary.averages.priorityScore} detail="ranking" />
            <Metric label="Commercial" value={summary.averages.commercialWarmth} detail="warmth" />
            <Metric label="Community" value={summary.averages.communityDepth} detail="depth" />
            <Metric label="Data" value={summary.averages.dataConfidence} detail="confidence" />
          </div>
        </div>
      </section>

      <section className="panel wide">
        <div className="panelHeader">
          <h2>Top Priority</h2>
          <span>{summary.topPriority.length} shown</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Commercial</th>
                <th>Community</th>
                <th>Action</th>
                <th>Fit</th>
              </tr>
            </thead>
            <tbody>
              {summary.topPriority.map((person) => (
                <tr key={person.personId}>
                  <td>
                    <Link className="personLink" href={`/crm-vnext/person/${encodeURIComponent(person.personId)}`}>
                      <span className="identity">{primaryIdentity(person)}</span>
                    </Link>
                    <small>
                      {person.channels.email ? 'email' : '-'} / {person.channels.instagram ? 'ig' : '-'}
                    </small>
                  </td>
                  <td>{stageLabels[person.stage]}</td>
                  <td>{person.priorityScore}</td>
                  <td>{person.commercialWarmth}</td>
                  <td>{person.communityDepth}</td>
                  <td>{labelAction(person.nextAction)}</td>
                  <td>
                    {person.primaryProductFit.key} {person.primaryProductFit.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    max-width: 1220px;
    margin: 0 auto 24px;
  }

  .eyebrow {
    margin: 0 0 6px;
    color: #5d6f61;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1, h2, p {
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
    gap: 4px;
    text-align: right;
    color: #4b4f49;
  }

  .source span {
    font-weight: 700;
  }

  .source small {
    font-size: 12px;
  }

  .navLink {
    color: #253f2b;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }

  .navLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .metrics,
  .grid,
  .wide {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .panel,
  .metric,
  .emptyState {
    border: 1px solid #ded8cc;
    background: #fffdfa;
    border-radius: 8px;
  }

  .panel {
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
  }

  .panelHeader span {
    color: #74796f;
    font-size: 13px;
  }

  .metric {
    min-height: 96px;
    padding: 14px;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .metric span,
  .metric small {
    color: #666b62;
  }

  .metric strong {
    font-size: 30px;
    line-height: 1;
  }

  .metric.strong {
    border-color: #3c5441;
    background: #eef4ed;
  }

  .metric.good {
    border-color: #96b899;
  }

  .metric.warn {
    border-color: #d8ad72;
    background: #fff8ec;
  }

  .bars,
  .actionList {
    display: grid;
    gap: 14px;
  }

  .barMeta,
  .actionRow {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 6px;
    font-size: 14px;
  }

  .barTrack {
    height: 9px;
    background: #ece7dc;
    border-radius: 999px;
    overflow: hidden;
  }

  .barFill {
    height: 100%;
    background: #3c5441;
    border-radius: inherit;
  }

  .gapList,
  .avgGrid,
  .movementSummary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .avgGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .movementSummary {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-bottom: 12px;
  }

  .movementList {
    display: grid;
    gap: 8px;
  }

  .movementRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px 72px;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid #eee8dd;
  }

  .movementRow:first-child {
    border-top: 0;
  }

  .deltaBox,
  .scorePair {
    min-height: 54px;
    border: 1px solid #ded8cc;
    border-radius: 8px;
    display: grid;
    place-items: center;
    align-content: center;
    background: #fffdfa;
  }

  .deltaBox b,
  .scorePair span {
    font-size: 20px;
    line-height: 1;
  }

  .deltaBox small,
  .scorePair small,
  .emptyNote {
    color: #767b72;
  }

  .deltaBox.up {
    border-color: #96b899;
    background: #f1f7f0;
  }

  .deltaBox.down {
    border-color: #d8ad72;
    background: #fff8ec;
  }

  .emptyNote {
    font-size: 14px;
  }

  .tableWrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 12px 10px;
    border-bottom: 1px solid #eee8dd;
    text-align: left;
    font-size: 14px;
    vertical-align: top;
  }

  th {
    color: #5b6158;
    font-size: 12px;
    text-transform: uppercase;
  }

  .identity {
    display: block;
    max-width: 240px;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  .personLink {
    color: #253f2b;
    text-decoration: none;
  }

  .personLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  td small {
    display: block;
    margin-top: 4px;
    color: #767b72;
  }

  .emptyState {
    max-width: 720px;
    margin: 96px auto;
    padding: 24px;
    display: grid;
    gap: 12px;
  }

  @media (max-width: 860px) {
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

    .metrics,
    .grid,
    .gapList,
    .avgGrid,
    .movementSummary,
    .movementRow {
      grid-template-columns: 1fr;
    }
  }
`;
