import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  buildCommunityDailyBrief,
  type CommunityDailyBrief,
} from '../../lib/crm/community-daily-brief';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../lib/crm/community-insights-source';
import {
  readCommunityQueueSnapshot,
  snapshotToPreviousMatched,
} from '../../lib/crm/community-queue-snapshots';
import { buildCrmVNextEngagementMovementQueue } from '../../lib/crm/crm-vnext-engagement-movement-queue';

type DailyBriefPageProps =
  | {
      enabled: true;
      source: PublicPersonCardsVNextSource;
      snapshot: {
        previousLoaded: boolean;
        previousGeneratedAt: string | null;
      };
      brief: CommunityDailyBrief;
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

const labelText = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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

const queryFromFilters = (filters: CommunityDailyBrief['focusQueues'][number]['queue']['filters']): string => {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.nextAction) params.set('action', filters.nextAction);
  if (filters.channel) params.set('channel', filters.channel);
  if (filters.productFit) params.set('product', filters.productFit);
  if (filters.minProductFit !== undefined && filters.minProductFit !== null) {
    params.set('minProductFit', String(filters.minProductFit));
  }
  if (filters.minPriority !== undefined && filters.minPriority !== null) {
    params.set('minPriority', String(filters.minPriority));
  }
  if (filters.limit !== undefined && filters.limit !== null) params.set('limit', String(filters.limit));
  return params.toString();
};

const peopleHref = (queue: CommunityDailyBrief['focusQueues'][number]['queue']): string => {
  const query = queryFromFilters(queue.filters);
  return query ? `/crm-vnext/people?${query}` : '/crm-vnext/people';
};

export const getServerSideProps: GetServerSideProps<DailyBriefPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext daily brief is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const [payload, previousSnapshot, engagementMovementQueue] = await Promise.all([
      loadPersonCardsVNext(),
      process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH
        ? readCommunityQueueSnapshot(process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH)
        : Promise.resolve(null),
      buildCrmVNextEngagementMovementQueue({
        limit: 25,
        includeUnchanged: false,
      }),
    ]);

    return {
      props: {
        enabled: true,
        source: publicPersonCardsVNextSource(payload.source),
        snapshot: {
          previousLoaded: Boolean(previousSnapshot),
          previousGeneratedAt: previousSnapshot?.generatedAt ?? null,
        },
        brief: buildCommunityDailyBrief(payload.cards, {
          previousMatched: snapshotToPreviousMatched(previousSnapshot),
          focusQueueLimit: 3,
          peoplePerQueue: 3,
          engagementMovementQueue,
        }),
      },
    };
  } catch (error) {
    console.error('crm-vnext daily brief load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext daily brief.',
      },
    };
  }
};

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function CrmVNextDailyBriefPage(props: DailyBriefPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Daily Brief</title>
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

  const { brief, source, snapshot } = props;
  const total = brief.summary.totals.cards;

  return (
    <main className="page">
      <Head>
        <title>Mantis Daily Brief - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Mantis Daily Brief</h1>
          <p className="lede">Read-only operating view for community intelligence, queues, and safe next steps.</p>
        </div>
        <div className="source">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>Snapshot: {source.generatedAt || 'unknown'}</small>
          <small>Previous queue snapshot: {snapshot.previousLoaded ? snapshot.previousGeneratedAt : 'not loaded'}</small>
        </div>
      </header>

      <section className="metrics" aria-label="Daily brief metrics">
        <Metric label="People" value={numberFmt.format(total)} detail="local person cards" />
        <Metric
          label="Email"
          value={numberFmt.format(brief.summary.totals.emailPresent)}
          detail={pct(brief.summary.totals.emailPresent, total)}
        />
        <Metric
          label="Instagram"
          value={numberFmt.format(brief.summary.totals.instagramPresent)}
          detail={pct(brief.summary.totals.instagramPresent, total)}
        />
        <Metric
          label="Queues"
          value={`${brief.queues.totals.notify}/${brief.queues.totals.watch}/${brief.queues.totals.ok}`}
          detail="notify / watch / ok"
        />
        <Metric
          label="Actions"
          value={brief.engagement ? numberFmt.format(brief.engagement.totals.rows) : 0}
          detail={brief.engagement ? `${brief.engagement.totals.reviewRows} review rows` : 'movement queue not loaded'}
        />
      </section>

      <section className="briefGrid">
        <article className="panel">
          <div className="panelHeader">
            <h2>Highlights</h2>
            <span>{brief.highlights.length} signals</span>
          </div>
          <div className="stack">
            {brief.highlights.map((item) => (
              <div className={`highlight ${item.level}`} key={item.code}>
                <span>{labelText(item.level)}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Next Steps</h2>
            <span>Read-only</span>
          </div>
          <div className="stack">
            {brief.nextSteps.map((step) => (
              <div className="step" key={step.code}>
                <div>
                  <strong>{labelText(step.code)}</strong>
                  <p>{step.action}</p>
                </div>
                <div className="stepMeta">
                  <span>{labelText(step.priority)}</span>
                  <small>{step.requiresApproval ? 'Approval needed' : 'Operator planning'}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {brief.engagement ? (
        <section className="engagementSection">
          <div className="sectionHeader">
            <h2>Engagement Actions</h2>
            <span>{numberFmt.format(brief.engagement.totals.reviewRows)} review rows</span>
          </div>
          <div className="actionGrid">
            {brief.engagement.topActions.length ? brief.engagement.topActions.map((action) => (
              <article className="actionCard" key={action.code}>
                <div className="actionTop">
                  <strong>{action.label}</strong>
                  <span>{numberFmt.format(action.count)}</span>
                </div>
                <div className="actionMeta">
                  <span>{labelText(action.category)}</span>
                  <span>{action.reviewRequired ? 'Review' : 'Observe'}</span>
                  <span>{action.outboundApprovalRequired ? 'Approval boundary' : 'No outbound implied'}</span>
                </div>
                {action.representativeReason ? <p>{action.representativeReason}</p> : null}
              </article>
            )) : (
              <article className="actionCard">
                <div className="actionTop">
                  <strong>No engagement actions</strong>
                  <span>0</span>
                </div>
                <p>No stored movement rows are ready for daily action routing.</p>
              </article>
            )}
          </div>
          <p className="operatorNote">{brief.engagement.operatorNote}</p>
        </section>
      ) : null}

      <section className="focusSection">
        <div className="sectionHeader">
          <h2>Focus Queues</h2>
          <span>{brief.focusQueues.length} selected</span>
        </div>
        <div className="queueGrid">
          {brief.focusQueues.map((focusQueue) => (
            <article className="queueCard" key={focusQueue.queue.id}>
              <div className="queueHeader">
                <div>
                  <h3>{focusQueue.queue.title}</h3>
                  <p>{focusQueue.queue.purpose}</p>
                </div>
                <div className={`queueStatus ${focusQueue.queue.status?.level ?? 'ok'}`}>
                  {labelText(focusQueue.queue.status?.level ?? 'ok')}
                </div>
              </div>
              <div className="queueStats">
                <span>{numberFmt.format(focusQueue.queue.counts.matched)} matched</span>
                <span>{numberFmt.format(focusQueue.queue.counts.returned)} shown</span>
              </div>
              <Link className="openQueue" href={peopleHref(focusQueue.queue)}>Open full queue</Link>

              <div className="peopleList">
                {focusQueue.people.map((person) => (
                  <Link
                    className="personRow"
                    href={`/crm-vnext/person/${encodeURIComponent(person.personId)}`}
                    key={person.personId}
                  >
                    <div>
                      <strong>{person.displayName || person.identities.email || person.identities.instagramHandle || person.personId}</strong>
                      <small>{person.stage.label} - {labelText(person.nextAction.code)}</small>
                    </div>
                    <span>{person.scores.priority}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="safety">
        <div>
          <span>Safety</span>
          <strong>No outbound. No record mutation.</strong>
        </div>
        <p>{brief.safety.prohibitedActions.join(' ')}</p>
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
    background: #f5f3ee;
    color: #151915;
  }

  .hero,
  .metrics,
  .briefGrid,
  .engagementSection,
  .focusSection,
  .safety {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-end;
    margin-bottom: 24px;
  }

  .backLink,
  .openQueue {
    color: #325c55;
    font-weight: 700;
    text-decoration: none;
  }

  .eyebrow {
    margin: 22px 0 8px;
    color: #58726c;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    font-size: 44px;
    line-height: 1;
  }

  .lede {
    max-width: 620px;
    margin-top: 12px;
    color: #50615d;
    font-size: 16px;
    line-height: 1.5;
  }

  .source {
    min-width: 260px;
    display: grid;
    gap: 5px;
    padding: 16px;
    border: 1px solid #d7d0c2;
    border-radius: 8px;
    background: #fffdf8;
  }

  .source span {
    font-weight: 800;
  }

  .source small,
  .metric small,
  .panelHeader span,
  .sectionHeader span,
  .personRow small,
  .stepMeta small {
    color: #65726f;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .metric,
  .panel,
  .actionCard,
  .queueCard,
  .safety {
    border: 1px solid #d7d0c2;
    border-radius: 8px;
    background: #fffdf8;
  }

  .metric {
    display: grid;
    gap: 6px;
    padding: 16px;
  }

  .metric span {
    color: #586763;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .metric strong {
    font-size: 28px;
  }

  .briefGrid {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 18px;
    margin-bottom: 24px;
  }

  .panel {
    padding: 18px;
  }

  .panelHeader,
  .sectionHeader,
  .queueHeader,
  .step {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .panelHeader,
  .sectionHeader {
    align-items: center;
    margin-bottom: 14px;
  }

  .stack {
    display: grid;
    gap: 10px;
  }

  .highlight,
  .step {
    padding: 12px;
    border: 1px solid #e3ddd2;
    border-radius: 8px;
    background: #f8f6ef;
  }

  .highlight span,
  .stepMeta span,
  .queueStatus {
    display: inline-flex;
    width: fit-content;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    background: #e9eee9;
    color: #304f47;
  }

  .highlight.watch span,
  .queueStatus.watch {
    background: #f1e4bf;
    color: #76591d;
  }

  .highlight.notify span,
  .queueStatus.notify {
    background: #f5d0c5;
    color: #803323;
  }

  .highlight strong,
  .step strong {
    display: block;
    margin-top: 8px;
  }

  .highlight p,
  .step p,
  .queueCard p,
  .safety p {
    margin-top: 6px;
    color: #53625f;
    line-height: 1.45;
  }

  .stepMeta {
    display: grid;
    justify-items: end;
    align-content: start;
    gap: 8px;
    min-width: 128px;
  }

  .engagementSection {
    margin-bottom: 24px;
  }

  .actionGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .actionCard {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .actionTop {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .actionTop strong {
    overflow-wrap: anywhere;
  }

  .actionTop span {
    min-width: 36px;
    text-align: right;
    color: #325c55;
    font-size: 28px;
    font-weight: 900;
  }

  .actionMeta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .actionMeta span {
    padding: 5px 8px;
    border-radius: 999px;
    background: #eef1ec;
    color: #40524d;
    font-size: 12px;
    font-weight: 800;
  }

  .actionCard p,
  .operatorNote {
    color: #53625f;
    line-height: 1.45;
  }

  .operatorNote {
    margin-top: 12px;
  }

  .focusSection {
    margin-bottom: 24px;
  }

  .queueGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .queueCard {
    padding: 16px;
  }

  .queueHeader {
    align-items: flex-start;
  }

  .queueStats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 14px 0;
  }

  .queueStats span {
    padding: 6px 9px;
    border-radius: 999px;
    background: #eef1ec;
    color: #3e504c;
    font-size: 13px;
    font-weight: 700;
  }

  .peopleList {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }

  .personRow {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px;
    border: 1px solid #e2dccf;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
    background: #faf8f2;
  }

  .personRow div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .personRow strong,
  .personRow small {
    overflow-wrap: anywhere;
  }

  .personRow span {
    align-self: center;
    min-width: 34px;
    text-align: right;
    font-weight: 900;
    color: #325c55;
  }

  .safety {
    padding: 16px;
    display: grid;
    gap: 8px;
  }

  .safety span {
    color: #6d4f2a;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .emptyState {
    max-width: 760px;
    margin: 20vh auto 0;
    padding: 24px;
    border: 1px solid #d7d0c2;
    border-radius: 8px;
    background: #fffdf8;
  }

  .emptyState h1 {
    margin-top: 16px;
  }

  .emptyState p {
    margin-top: 12px;
    color: #53625f;
  }

  @media (max-width: 900px) {
    .page {
      padding: 20px;
    }

    .hero,
    .briefGrid {
      grid-template-columns: 1fr;
      display: grid;
    }

    .metrics,
    .actionGrid,
    .queueGrid {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 34px;
    }

    .step {
      display: grid;
    }

    .stepMeta {
      justify-items: start;
    }
  }
`;
