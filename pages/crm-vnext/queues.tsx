import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  buildCommunityQueues,
  type CommunityQueueResult,
} from '../../lib/crm/community-queues';
import {
  loadLegacyPersonCardsV1AsPersonCards,
  type PersonCardsVNextSourceResult,
} from '../../lib/crm/community-insights-source';

type QueuesPageProps =
  | {
      enabled: true;
      source: Omit<PersonCardsVNextSourceResult['source'], 'path'>;
      queues: CommunityQueueResult[];
    }
  | {
      enabled: false;
      error: string;
    };

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const queryFromFilters = (filters: CommunityQueueResult['filters']): string => {
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

const peopleHref = (queue: CommunityQueueResult): string => {
  const query = queryFromFilters(queue.filters);
  return query ? `/crm-vnext/people?${query}` : '/crm-vnext/people';
};

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

const identity = (person: CommunityQueueResult['result']['people'][number]): string =>
  person.displayName || person.identities.email || person.identities.instagramHandle || person.personId;

export const getServerSideProps: GetServerSideProps<QueuesPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext queues are disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const payload = await loadLegacyPersonCardsV1AsPersonCards();
    return {
      props: {
        enabled: true,
        source: {
          kind: payload.source.kind,
          generatedAt: payload.source.generatedAt,
          cards: payload.source.cards,
        },
        queues: buildCommunityQueues(payload.cards),
      },
    };
  } catch (error) {
    console.error('crm-vnext queues load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext queues.',
      },
    };
  }
};

export default function CrmVNextQueuesPage(props: QueuesPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Queues</title>
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

  const totalMatched = props.queues.reduce((sum, queue) => sum + queue.result.matched, 0);

  return (
    <main className="page">
      <Head>
        <title>Mantis Queues - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Mantis Queues</h1>
        </div>
        <div className="source">
          <span>{numberFmt.format(props.source.cards)} local cards</span>
          <small>Snapshot: {props.source.generatedAt || 'unknown'}</small>
        </div>
      </header>

      <section className="summary" aria-label="Queue summary">
        <div>
          <span>Queues</span>
          <strong>{props.queues.length}</strong>
        </div>
        <div>
          <span>Total matched</span>
          <strong>{numberFmt.format(totalMatched)}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>Read-only</strong>
        </div>
      </section>

      <section className="queueGrid">
        {props.queues.map((queue) => (
          <article className="queueCard" key={queue.id}>
            <div className="queueHeader">
              <div>
                <h2>{queue.title}</h2>
                <p>{queue.purpose}</p>
              </div>
              <strong>{numberFmt.format(queue.result.matched)}</strong>
            </div>
            <p className="note">{queue.operatorNote}</p>
            <div className="queueActions">
              <Link href={peopleHref(queue)}>Open full queue</Link>
            </div>
            {queue.result.people.length ? (
              <div className="miniTable">
                {queue.result.people.slice(0, 5).map((person) => (
                  <div className="personRow" key={person.personId}>
                    <div>
                      <Link href={`/crm-vnext/person/${encodeURIComponent(person.personId)}`}>
                        <span>{identity(person)}</span>
                      </Link>
                      <small>{person.personId}</small>
                    </div>
                    <b>{labelAction(person.nextAction)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">No local rows match this queue yet.</p>
            )}
          </article>
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
  .queueGrid {
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
  .queueActions a,
  .personRow a,
  .emptyState a {
    color: #253f2b;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink {
    display: inline-block;
    margin-bottom: 14px;
    font-size: 14px;
  }

  .backLink:hover,
  .queueActions a:hover,
  .personRow a:hover,
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

  .summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .summary div,
  .queueCard,
  .emptyState {
    border: 1px solid #ded8cc;
    background: #fffdfa;
    border-radius: 8px;
  }

  .summary div {
    min-height: 76px;
    padding: 14px;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .summary span,
  .queueHeader p,
  .note,
  .empty,
  .personRow small {
    color: #666b62;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
  }

  .queueGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .queueCard {
    padding: 18px;
    display: grid;
    gap: 14px;
  }

  .queueHeader {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .queueHeader div {
    display: grid;
    gap: 6px;
  }

  .queueHeader strong {
    color: #253f2b;
    font-size: 34px;
    line-height: 1;
  }

  .note {
    line-height: 1.45;
  }

  .queueActions {
    display: flex;
    justify-content: flex-start;
  }

  .miniTable {
    display: grid;
    gap: 8px;
  }

  .personRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 10px;
    border: 1px solid #eee8dd;
    border-radius: 8px;
    background: #fffefa;
  }

  .personRow span,
  .personRow small,
  .personRow b {
    overflow-wrap: anywhere;
  }

  .personRow span {
    display: block;
  }

  .personRow small {
    display: block;
    margin-top: 3px;
  }

  .personRow b {
    color: #4b4f49;
    font-size: 13px;
    text-align: right;
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

    .summary,
    .queueGrid {
      grid-template-columns: 1fr;
    }
  }
`;
