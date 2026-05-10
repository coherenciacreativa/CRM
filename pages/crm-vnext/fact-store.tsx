import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  readCrmFactStore,
  type CrmFactStoreReadResult,
  type CrmStoredFact,
} from '../../lib/crm/crm-vnext-fact-store';

type FactStorePageProps =
  | {
      enabled: true;
      store: CrmFactStoreReadResult;
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

const personLabel = (stored: CrmStoredFact): string =>
  stored.fact.person.rawName
  || stored.fact.person.personIdHint
  || stored.fact.person.instagramHandle
  || stored.fact.person.email
  || stored.fact.person.phone
  || stored.factId;

export const getServerSideProps: GetServerSideProps<FactStorePageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext fact store is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    return {
      props: {
        enabled: true,
        store: await readCrmFactStore(undefined, { limit: 50 }),
      },
    };
  } catch (error) {
    console.error('crm-vnext fact store page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load CRM vNext fact store.',
      },
    };
  }
};

export default function CrmVNextFactStorePage(props: FactStorePageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Fact Store</title>
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

  const { store } = props;
  const topTypes = Object.entries(store.summary.factTypes)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <main className="page">
      <Head>
        <title>Fact Store - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Fact Store</h1>
        </div>
        <div className="mode">
          <span>Local ledger</span>
          <small>{store.generatedAt}</small>
          <Link className="reviewLink" href="/crm-vnext/identity-review">Open Identity Review</Link>
        </div>
      </header>

      <section className="summary">
        <div>
          <span>Facts</span>
          <strong>{numberFmt.format(store.summary.facts)}</strong>
        </div>
        <div>
          <span>Ready</span>
          <strong>{numberFmt.format(store.summary.readyForCardApply)}</strong>
        </div>
        <div>
          <span>Review</span>
          <strong>{numberFmt.format(store.summary.needsReview)}</strong>
        </div>
        <div>
          <span>Stable ID</span>
          <strong>{numberFmt.format(store.summary.stableIdentity)}</strong>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panelHeader">
            <h2>Fact Types</h2>
            <span>{topTypes.length || 0}</span>
          </div>
          {topTypes.length ? (
            <div className="rows">
              {topTypes.map(([type, count]) => (
                <div className="row" key={type}>
                  <span>{label(type)}</span>
                  <b>{numberFmt.format(count)}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No facts stored yet.</p>
          )}
        </article>

        <article className="panel wide">
          <div className="panelHeader">
            <h2>Latest Facts</h2>
            <span>{store.facts.length} shown</span>
          </div>
          {store.facts.length ? (
            <div className="factList">
              {store.facts.map((stored) => (
                <div className="fact" key={stored.storedFactId}>
                  <div className="factTop">
                    <strong>{personLabel(stored)}</strong>
                    <span className={stored.cardApply.status}>{label(stored.cardApply.status)}</span>
                  </div>
                  <p>{stored.fact.evidenceText}</p>
                  <div className="meta">
                    <b>{label(stored.fact.type)}</b>
                    <b>{label(stored.fact.source.kind)}</b>
                    <b>{stored.storeApprovedBy}</b>
                    <b>{stored.storedAt}</b>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Approved facts will appear here after a local store write.</p>
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
    color: #586157;
    font-size: 13px;
  }

  .mode span {
    border: 1px solid #99b39b;
    border-radius: 999px;
    background: #e9f1e4;
    color: #253f2b;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .reviewLink {
    color: #253f2b;
    font-weight: 800;
    text-decoration: none;
  }

  .reviewLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
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
    border: 1px solid #dde0d6;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.84);
  }

  .summary div {
    display: grid;
    gap: 8px;
    padding: 16px;
  }

  .summary span,
  .panelHeader span,
  .row span {
    color: #627064;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
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

  .panelHeader h2 {
    font-size: 18px;
  }

  .rows,
  .factList {
    display: grid;
    gap: 10px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #eceee7;
    padding-top: 10px;
  }

  .row:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .fact {
    display: grid;
    gap: 9px;
    border-top: 1px solid #eceee7;
    padding-top: 12px;
  }

  .fact:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .factTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .factTop span {
    border: 1px solid #cad2c5;
    border-radius: 999px;
    background: #f7f8f4;
    color: #253f2b;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .factTop span.needs_review {
    border-color: #d4bd79;
    background: #fff7da;
    color: #6d521a;
  }

  .fact p,
  .empty {
    color: #586157;
    line-height: 1.45;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .meta b {
    border: 1px solid #cad2c5;
    border-radius: 999px;
    background: #f7f8f4;
    color: #253f2b;
    padding: 4px 8px;
    font-size: 11px;
    text-transform: uppercase;
  }

  .emptyState {
    max-width: 720px;
    margin: 80px auto;
    padding: 24px;
  }

  @media (max-width: 860px) {
    .page {
      padding: 20px;
    }

    .hero {
      align-items: flex-start;
      flex-direction: column;
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
