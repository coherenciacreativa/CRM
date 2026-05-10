import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../lib/crm/community-insights-source';
import {
  buildCrmVNextCardRebuildDiff,
  type CrmCardRebuildDiff,
  type CrmCardRebuildDiffReport,
} from '../../lib/crm/crm-vnext-card-rebuild-diff';
import { buildCrmVNextIdentityReview } from '../../lib/crm/crm-vnext-identity-review';
import { readCrmFactStore } from '../../lib/crm/crm-vnext-fact-store';

type CardRebuildDiffPageProps =
  | {
      enabled: true;
      source: PublicLegacyPersonCardsV1Source;
      diff: CrmCardRebuildDiffReport;
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

const diffName = (diff: CrmCardRebuildDiff): string =>
  diff.displayName || diff.personId;

export const getServerSideProps: GetServerSideProps<CardRebuildDiffPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext card rebuild diff is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards();
    const store = await readCrmFactStore(undefined, { limit: 50 });
    const review = buildCrmVNextIdentityReview({
      cards: cardsPayload.cards,
      facts: store.facts,
    });

    return {
      props: {
        enabled: true,
        source: publicLegacyPersonCardsV1Source(cardsPayload.source),
        diff: buildCrmVNextCardRebuildDiff({
          cards: cardsPayload.cards,
          review,
        }),
      },
    };
  } catch (error) {
    console.error('crm-vnext card rebuild diff page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load CRM vNext card rebuild diff.',
      },
    };
  }
};

export default function CrmVNextCardRebuildDiffPage(props: CardRebuildDiffPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Card Rebuild Diff</title>
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

  const { diff, source } = props;

  return (
    <main className="page">
      <Head>
        <title>Card Rebuild Diff - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Card Rebuild Diff</h1>
        </div>
        <div className="mode">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>{diff.generatedAt}</small>
          <Link className="reviewLink" href="/crm-vnext/identity-review">Identity Review</Link>
        </div>
      </header>

      <section className="summary">
        <div>
          <span>Review Items</span>
          <strong>{numberFmt.format(diff.summary.reviewItems)}</strong>
        </div>
        <div>
          <span>Cards With Diffs</span>
          <strong>{numberFmt.format(diff.summary.cardsWithDiffs)}</strong>
        </div>
        <div>
          <span>Operations</span>
          <strong>{numberFmt.format(diff.summary.operations)}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{numberFmt.format(diff.summary.blockedItems)}</strong>
        </div>
      </section>

      <section className="grid">
        <article className="panel wide">
          <div className="panelHeader">
            <h2>Ready Diffs</h2>
            <span>{diff.diffs.length} cards</span>
          </div>
          {diff.diffs.length ? (
            <div className="rows">
              {diff.diffs.map((item) => (
                <div className="diff" key={item.personId}>
                  <div className="diffTop">
                    <strong>{diffName(item)}</strong>
                    <span>{item.proposed.operations.length} ops</span>
                  </div>
                  <div className="beforeAfter">
                    <div>
                      <span>Current</span>
                      <b>{item.current.stage}</b>
                      <small>{item.current.nextAction}</small>
                    </div>
                    <div>
                      <span>Proposed</span>
                      <b>{item.proposed.evidenceToAdd.length} evidence</b>
                      <small>{item.proposed.tagsToAdd.join(', ') || 'no tags'}</small>
                    </div>
                  </div>
                  <div className="ops">
                    {item.proposed.operations.slice(0, 6).map((operation, index) => (
                      <b key={`${item.personId}-${operation.op}-${index}`}>{label(operation.op)}</b>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No card diffs are ready because the real Fact Store currently has no ready facts.</p>
          )}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Blocked Items</h2>
            <span>{diff.blockedItems.length} facts</span>
          </div>
          {diff.blockedItems.length ? (
            <div className="compactList">
              {diff.blockedItems.map((item) => (
                <div className="compact" key={item.storedFactId}>
                  <div>
                    <strong>{item.personHint.rawName || item.personHint.personIdHint || item.personHint.instagramHandle || item.factId}</strong>
                    <p>{item.reason}</p>
                  </div>
                  <span>{label(item.status)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Nothing is blocked in the current fact window.</p>
          )}
        </article>
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
  .grid {
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
  .reviewLink,
  .emptyState a {
    color: #253f2b;
    font-weight: 800;
    text-decoration: none;
  }

  .backLink:hover,
  .reviewLink:hover,
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

  .mode {
    display: grid;
    justify-items: end;
    gap: 6px;
    color: #3a463b;
  }

  .mode span {
    font-weight: 800;
  }

  .mode small,
  .beforeAfter small {
    color: #687269;
  }

  .reviewLink {
    font-size: 13px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .summary div,
  .panel,
  .emptyState {
    border: 1px solid #d8d3c7;
    border-radius: 8px;
    background: #fffdf8;
    box-shadow: 0 16px 40px rgba(34, 45, 35, 0.08);
  }

  .summary div {
    padding: 16px;
    display: grid;
    gap: 6px;
  }

  .summary span,
  .panelHeader span,
  .beforeAfter span {
    color: #687269;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .summary strong {
    font-size: 30px;
    line-height: 1;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
    gap: 16px;
  }

  .panel {
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 19px;
    letter-spacing: 0;
  }

  .rows,
  .compactList {
    display: grid;
    gap: 10px;
  }

  .diff,
  .compact {
    border: 1px solid #e3ded2;
    border-radius: 8px;
    background: #fbfaf5;
    padding: 14px;
  }

  .diffTop,
  .compact {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .diffTop span,
  .ops b,
  .compact span {
    border-radius: 999px;
    background: #eef0e7;
    color: #2e3f32;
    font-size: 12px;
    font-weight: 800;
    padding: 6px 8px;
    white-space: nowrap;
  }

  .beforeAfter {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }

  .beforeAfter div {
    display: grid;
    gap: 5px;
    border: 1px solid #e6e1d5;
    border-radius: 8px;
    padding: 10px;
  }

  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .compact p,
  .empty {
    color: #535d54;
    line-height: 1.45;
    margin-top: 8px;
  }

  .emptyState {
    max-width: 740px;
    margin: 100px auto;
    padding: 28px;
  }

  @media (max-width: 880px) {
    .page {
      padding: 20px;
    }

    .hero {
      display: grid;
      align-items: start;
    }

    .mode {
      justify-items: start;
    }

    .summary,
    .grid,
    .beforeAfter {
      grid-template-columns: 1fr;
    }
  }
`;
