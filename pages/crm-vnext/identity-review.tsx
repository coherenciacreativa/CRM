import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../lib/crm/community-insights-source';
import {
  buildCrmVNextIdentityReview,
  type CrmIdentityReviewItem,
  type CrmIdentityReviewReport,
} from '../../lib/crm/crm-vnext-identity-review';
import { readCrmFactStore } from '../../lib/crm/crm-vnext-fact-store';

type IdentityReviewPageProps =
  | {
      enabled: true;
      source: PublicLegacyPersonCardsV1Source;
      review: CrmIdentityReviewReport;
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

const personLabel = (item: CrmIdentityReviewItem): string =>
  item.fact.person.rawName
  || item.fact.person.personIdHint
  || item.fact.person.instagramHandle
  || item.fact.person.email
  || item.fact.person.phone
  || item.factId;

const firstCandidate = (item: CrmIdentityReviewItem): string => {
  const candidate = item.candidates[0];
  if (!candidate) return 'No candidate';
  return candidate.displayName || candidate.personId;
};

export const getServerSideProps: GetServerSideProps<IdentityReviewPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext identity review is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards();
    const store = await readCrmFactStore(undefined, { limit: 50 });
    return {
      props: {
        enabled: true,
        source: publicLegacyPersonCardsV1Source(cardsPayload.source),
        review: buildCrmVNextIdentityReview({
          cards: cardsPayload.cards,
          facts: store.facts,
        }),
      },
    };
  } catch (error) {
    console.error('crm-vnext identity review page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load CRM vNext identity review.',
      },
    };
  }
};

export default function CrmVNextIdentityReviewPage(props: IdentityReviewPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Identity Review</title>
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

  const { review, source } = props;
  const ready = review.items.filter((item) => item.status === 'ready_for_preview');
  const reviewNeeded = review.items.filter((item) => item.status !== 'ready_for_preview');

  return (
    <main className="page">
      <Head>
        <title>Identity Review - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Identity Review</h1>
        </div>
        <div className="mode">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>{review.generatedAt}</small>
          <Link className="diffLink" href="/crm-vnext/card-rebuild-diff">Open Card Diff</Link>
        </div>
      </header>

      <section className="summary">
        <div>
          <span>Facts</span>
          <strong>{numberFmt.format(review.summary.facts)}</strong>
        </div>
        <div>
          <span>Ready</span>
          <strong>{numberFmt.format(review.summary.readyForPreview)}</strong>
        </div>
        <div>
          <span>Identity Review</span>
          <strong>{numberFmt.format(review.summary.needsIdentityReview)}</strong>
        </div>
        <div>
          <span>Unmatched</span>
          <strong>{numberFmt.format(review.summary.unmatched)}</strong>
        </div>
        <div>
          <span>Business Review</span>
          <strong>{numberFmt.format(review.summary.needsBusinessReview)}</strong>
        </div>
      </section>

      <section className="grid">
        <article className="panel wide">
          <div className="panelHeader">
            <h2>Ready For Preview</h2>
            <span>{ready.length} facts</span>
          </div>
          {ready.length ? (
            <div className="rows">
              {ready.map((item) => (
                <div className="fact" key={item.storedFactId}>
                  <div className="factTop">
                    <strong>{personLabel(item)}</strong>
                    <span className="ready">{firstCandidate(item)}</span>
                  </div>
                  <p>{item.fact.evidenceText}</p>
                  <div className="meta">
                    <b>{label(item.fact.type)}</b>
                    <b>{label(item.status)}</b>
                    <b>{item.preview?.currentCard.stage ?? 'unknown'}</b>
                    <b>{item.preview?.currentCard.nextAction ?? 'unknown'}</b>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No stored facts are ready for card-rebuild preview yet.</p>
          )}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Review Queue</h2>
            <span>{reviewNeeded.length} facts</span>
          </div>
          {reviewNeeded.length ? (
            <div className="compactList">
              {reviewNeeded.map((item) => (
                <div className="compact" key={item.storedFactId}>
                  <div>
                    <strong>{personLabel(item)}</strong>
                    <p>{item.reason}</p>
                  </div>
                  <span className={item.status}>{label(item.status)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No identity or business review items in the current store window.</p>
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

  .mode {
    display: grid;
    justify-items: end;
    gap: 6px;
    color: #3a463b;
  }

  .mode span {
    font-weight: 800;
  }

  .mode small {
    color: #687269;
  }

  .diffLink {
    color: #253f2b;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .diffLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .summary div,
  .panel {
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
  .panelHeader span {
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
    grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
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

  .fact,
  .compact {
    border: 1px solid #e3ded2;
    border-radius: 8px;
    background: #fbfaf5;
    padding: 14px;
  }

  .factTop,
  .compact {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .fact p,
  .compact p,
  .empty {
    color: #535d54;
    line-height: 1.45;
    margin-top: 8px;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .meta b,
  .factTop span,
  .compact span {
    border-radius: 999px;
    background: #eef0e7;
    color: #2e3f32;
    font-size: 12px;
    font-weight: 800;
    padding: 6px 8px;
    white-space: nowrap;
  }

  .factTop .ready {
    background: #dcebdd;
  }

  .compact span.needs_identity_review {
    background: #f2dfc8;
    color: #6a431a;
  }

  .compact span.unmatched {
    background: #eadbd6;
    color: #6c342e;
  }

  .compact span.needs_business_review {
    background: #e0e4f0;
    color: #293c70;
  }

  .emptyState {
    max-width: 740px;
    margin: 100px auto;
    border: 1px solid #d8d3c7;
    border-radius: 8px;
    background: #fffdf8;
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
    .grid {
      grid-template-columns: 1fr;
    }
  }
`;
