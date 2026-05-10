import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  COMMUNITY_STAGE_LABELS,
  type ProductFitKey,
  type ScoringReason,
} from '../../../lib/crm/community-scoring';
import {
  loadPersonCardVNextByPersonId,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import type { PersonCardVNext } from '../../../lib/crm/person-card-vnext';

type PersonPageProps =
  | {
      enabled: true;
      source: PublicPersonCardsVNextSource;
      card: PersonCardVNext;
    }
  | {
      enabled: false;
      error: string;
    };

const productLabels: Record<ProductFitKey, string> = {
  yoga: 'Yoga',
  mentorship: 'Mentoria',
  therapy: 'Terapia',
  digitalProducts: 'Digital',
  retreats: 'Retiros',
};

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const valueOrDash = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return numberFmt.format(value);
  return value;
};

const identityTitle = (card: PersonCardVNext): string =>
  card.displayName || card.identities.email || card.identities.instagramHandle || card.personId;

const productEntries = (card: PersonCardVNext): Array<{ key: ProductFitKey; label: string; score: number }> =>
  (Object.keys(productLabels) as ProductFitKey[]).map((key) => ({
    key,
    label: productLabels[key],
    score: card.scoring.productFit[key] ?? 0,
  }));

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

const getParam = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
};

export const getServerSideProps: GetServerSideProps<PersonPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext person detail is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  const personId = getParam(context.params?.personId);
  if (!personId) return { notFound: true };

  try {
    const payload = await loadPersonCardVNextByPersonId(personId);
    if (!payload.card) {
      return {
        props: {
          enabled: false,
          error: 'Person card not found in the local CRM vNext source.',
        },
      };
    }

    return {
      props: {
        enabled: true,
        source: publicPersonCardsVNextSource(payload.source),
        card: payload.card,
      },
    };
  } catch (error) {
    console.error('crm-vnext person detail load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext person detail.',
      },
    };
  }
};

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{valueOrDash(value)}</strong>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="scoreRow">
      <div className="scoreMeta">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="scoreTrack" aria-hidden="true">
        <div className="scoreFill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function ReasonList({ title, items }: { title: string; items: ScoringReason[] }) {
  return (
    <div className="reasonBlock">
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.code}>
              <b>{item.code}</b>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No signals yet.</p>
      )}
    </div>
  );
}

export default function CrmVNextPersonPage(props: PersonPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Person</title>
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

  const { card, source } = props;
  const title = identityTitle(card);

  return (
    <main className="page">
      <Head>
        <title>{`${title} - CRM vNext`}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">Person Card vNext</p>
          <h1>{title}</h1>
          <p className="personId">{card.personId}</p>
        </div>
        <div className="source">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>Snapshot: {source.generatedAt || 'unknown'}</small>
        </div>
      </header>

      <section className="stats" aria-label="Person scoring summary">
        <Stat label="Stage" value={COMMUNITY_STAGE_LABELS[card.scoring.stage]} detail="lifecycle" />
        <Stat label="Priority" value={card.scoring.priorityScore} detail="ranking" />
        <Stat label="Commercial" value={card.scoring.commercialWarmth} detail="warmth" />
        <Stat label="Action" value={labelAction(card.nextAction.code)} detail={card.nextAction.requiresHumanReview ? 'review required' : 'read-only'} />
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Identity</h2>
            <span>current profile</span>
          </div>
          <div className="fields">
            <Field label="Email" value={card.identities.email} />
            <Field label="Instagram" value={card.identities.instagramHandle ? `@${card.identities.instagramHandle}` : null} />
            <Field label="Phone" value={card.identities.phone} />
            <Field label="City" value={card.identities.city} />
            <Field label="Country" value={card.identities.country} />
            <Field label="IG user id" value={card.identities.instagramUserId} />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Channels</h2>
            <span>presence/status</span>
          </div>
          <div className="fields">
            <Field label="Email" value={card.channels.email.present ? card.channels.email.status || 'present' : null} />
            <Field label="Instagram" value={card.channels.instagram.present ? card.channels.instagram.status || 'present' : null} />
            <Field label="WhatsApp" value={card.channels.whatsapp.present ? card.channels.whatsapp.status || 'present' : null} />
            <Field label="Telegram" value={card.channels.telegram.present ? card.channels.telegram.status || 'present' : null} />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Scores</h2>
            <span>0-100</span>
          </div>
          <div className="scores">
            <ScoreBar label="Priority" value={card.scoring.priorityScore} />
            <ScoreBar label="Commercial warmth" value={card.scoring.commercialWarmth} />
            <ScoreBar label="Community depth" value={card.scoring.communityDepth} />
            <ScoreBar label="Relationship engagement" value={card.scoring.relationshipEngagement} />
            <ScoreBar label="Data confidence" value={card.scoring.dataConfidence} />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Product Fit</h2>
            <span>0-100</span>
          </div>
          <div className="scores">
            {productEntries(card).map((item) => (
              <ScoreBar key={item.key} label={item.label} value={item.score} />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Products</h2>
            <span>known history</span>
          </div>
          <div className="fields">
            <Field label="Yoga 90d" value={card.products.yogaClasses90d} />
            <Field label="Happy Circle 90d" value={card.products.happyCircle90d} />
            <Field label="Retreats attended" value={card.products.retreatsAttended} />
            <Field label="Purchases" value={card.products.purchaseCount} />
            <Field label="Total spend" value={card.products.totalSpend} />
            <Field label="Active client" value={card.products.activeClient} />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Next Action</h2>
            <span>Mantis guardrail</span>
          </div>
          <div className="actionBox">
            <strong>{labelAction(card.nextAction.code)}</strong>
            <p>{card.nextAction.reason}</p>
            <small>{card.nextAction.requiresHumanReview ? 'Requires human review before external outreach.' : 'No external action is sent from this page.'}</small>
          </div>
        </div>
      </section>

      <section className="panel wide">
        <div className="panelHeader">
          <h2>Reasons and Risks</h2>
          <span>scoring evidence</span>
        </div>
        <div className="reasonGrid">
          <ReasonList title="Reasons" items={card.scoring.reasons} />
          <ReasonList title="Risks" items={card.scoring.risks} />
        </div>
      </section>

      <section className="panel wide">
        <div className="panelHeader">
          <h2>Evidence</h2>
          <span>{card.evidence.length} items</span>
        </div>
        {card.evidence.length ? (
          <div className="evidenceList">
            {card.evidence.map((item, index) => (
              <div className="evidenceItem" key={`${item.source}-${index}`}>
                <strong>{item.source}</strong>
                <span>{item.observedAt || 'unknown date'}</span>
                {item.note ? <p>{item.note}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No evidence entries yet.</p>
        )}
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
  .stats,
  .grid,
  .wide {
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

  .backLink {
    display: inline-block;
    margin-bottom: 14px;
    color: #253f2b;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .eyebrow,
  .personId {
    margin: 0;
    color: #5d6f61;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .personId {
    margin-top: 10px;
    max-width: 760px;
    color: #667060;
    overflow-wrap: anywhere;
    text-transform: none;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    max-width: 820px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  h2 {
    font-size: 18px;
    line-height: 1.2;
  }

  h3 {
    font-size: 15px;
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

  .stats {
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
  .stat,
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

  .stat {
    min-height: 96px;
    padding: 14px;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .stat span,
  .stat small {
    color: #666b62;
  }

  .stat strong {
    font-size: 28px;
    line-height: 1;
    overflow-wrap: anywhere;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .field {
    min-height: 64px;
    padding: 12px;
    border: 1px solid #eee8dd;
    border-radius: 8px;
    background: #fffefa;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .field span {
    color: #666b62;
    font-size: 12px;
    text-transform: uppercase;
  }

  .field strong {
    font-size: 15px;
    overflow-wrap: anywhere;
  }

  .scores,
  .evidenceList,
  .reasonBlock ul {
    display: grid;
    gap: 12px;
  }

  .scoreMeta {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 6px;
    font-size: 14px;
  }

  .scoreTrack {
    height: 9px;
    background: #ece7dc;
    border-radius: 999px;
    overflow: hidden;
  }

  .scoreFill {
    height: 100%;
    background: #3c5441;
    border-radius: inherit;
  }

  .actionBox {
    display: grid;
    gap: 10px;
  }

  .actionBox strong {
    color: #253f2b;
    font-size: 22px;
    line-height: 1.1;
  }

  .actionBox p {
    color: #3f453d;
    line-height: 1.5;
  }

  .actionBox small,
  .muted {
    color: #74796f;
  }

  .reasonGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .reasonBlock {
    display: grid;
    gap: 12px;
  }

  .reasonBlock ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .reasonBlock li,
  .evidenceItem {
    padding: 12px;
    border: 1px solid #eee8dd;
    border-radius: 8px;
    background: #fffefa;
    display: grid;
    gap: 5px;
  }

  .reasonBlock li b,
  .evidenceItem strong {
    color: #253f2b;
    overflow-wrap: anywhere;
  }

  .reasonBlock li span,
  .evidenceItem span,
  .evidenceItem p {
    color: #5f665c;
    font-size: 14px;
    line-height: 1.4;
  }

  .emptyState {
    max-width: 720px;
    margin: 96px auto;
    padding: 24px;
    display: grid;
    gap: 12px;
  }

  .emptyState a {
    color: #253f2b;
    font-weight: 700;
    text-decoration: none;
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

    .stats,
    .grid,
    .fields,
    .reasonGrid {
      grid-template-columns: 1fr;
    }
  }
`;
