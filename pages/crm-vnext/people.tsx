import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import type {
  CommunityLifecycleStage,
  CommunityNextBestAction,
  ProductFitKey,
} from '../../lib/crm/community-scoring';
import {
  searchCommunityPersonCards,
  type CommunityPersonChannelFilter,
  type CommunityPersonSearchResult,
} from '../../lib/crm/community-person-search';
import {
  loadLegacyPersonCardsV1AsPersonCards,
  type PersonCardsVNextSourceResult,
} from '../../lib/crm/community-insights-source';

type PeoplePageProps =
  | {
      enabled: true;
      source: Omit<PersonCardsVNextSourceResult['source'], 'path'>;
      result: CommunityPersonSearchResult;
    }
  | {
      enabled: false;
      error: string;
    };

const STAGES: CommunityLifecycleStage[] = ['SEMILLA', 'GERMINADA', 'FLORECIDA', 'COSECHA'];
const ACTIONS: CommunityNextBestAction[] = [
  'complete_profile',
  'ask_for_email',
  'human_follow_up',
  'nurture_by_email',
  'invite_to_community_space',
  'respect_suppression',
  'keep_warming',
];
const CHANNELS: CommunityPersonChannelFilter[] = [
  'email',
  'instagram',
  'whatsapp',
  'telegram',
  'omnichannel',
  'missing_email_with_instagram',
  'missing_instagram_with_email',
];
const PRODUCTS: ProductFitKey[] = ['yoga', 'mentorship', 'therapy', 'digitalProducts', 'retreats'];

const stageLabels: Record<CommunityLifecycleStage, string> = {
  SEMILLA: 'Semilla',
  GERMINADA: 'Germinada',
  FLORECIDA: 'Florecida',
  COSECHA: 'Cosecha',
};

const channelLabels: Record<CommunityPersonChannelFilter, string> = {
  email: 'Email',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  omnichannel: 'Email + IG',
  missing_email_with_instagram: 'IG without email',
  missing_instagram_with_email: 'Email without IG',
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

const firstValue = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
};

const parsePositiveInt = (value: string | string[] | undefined, fallback: number): number => {
  const parsed = Number.parseInt(firstValue(value) ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const enumValue = <T extends string>(value: string | string[] | undefined, options: T[]): T | null => {
  const raw = firstValue(value);
  if (!raw) return null;
  return options.includes(raw as T) ? (raw as T) : null;
};

export const getServerSideProps: GetServerSideProps<PeoplePageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext people explorer is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    const payload = await loadLegacyPersonCardsV1AsPersonCards();
    const result = searchCommunityPersonCards(payload.cards, {
      query: firstValue(context.query.q),
      stage: enumValue(context.query.stage, STAGES),
      nextAction: enumValue(context.query.action, ACTIONS),
      channel: enumValue(context.query.channel, CHANNELS),
      productFit: enumValue(context.query.product, PRODUCTS),
      minProductFit: parsePositiveInt(context.query.minProductFit, 50),
      minPriority: parsePositiveInt(context.query.minPriority, 0),
      limit: parsePositiveInt(context.query.limit, 50),
    });

    return {
      props: {
        enabled: true,
        source: {
          kind: payload.source.kind,
          generatedAt: payload.source.generatedAt,
          cards: payload.source.cards,
        },
        result,
      },
    };
  } catch (error) {
    console.error('crm-vnext people explorer load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext people explorer.',
      },
    };
  }
};

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ''}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const identity = (person: CommunityPersonSearchResult['people'][number]): string =>
  person.displayName || person.identities.email || person.identities.instagramHandle || person.personId;

export default function CrmVNextPeoplePage(props: PeoplePageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext People</title>
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

  const { result, source } = props;

  return (
    <main className="page">
      <Head>
        <title>People Explorer - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <Link className="backLink secondary" href="/crm-vnext/queues">Mantis Queues</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>People Explorer</h1>
        </div>
        <div className="source">
          <span>{numberFmt.format(source.cards)} local cards</span>
          <small>Snapshot: {source.generatedAt || 'unknown'}</small>
        </div>
      </header>

      <section className="toolbar">
        <form method="get">
          <label className="query">
            <span>Search</span>
            <input name="q" defaultValue={result.filters.query ?? ''} placeholder="email, IG, city, country, name" />
          </label>

          <Select
            label="Stage"
            name="stage"
            value={result.filters.stage}
            options={STAGES.map((stage) => ({ value: stage, label: stageLabels[stage] }))}
          />
          <Select
            label="Action"
            name="action"
            value={result.filters.nextAction}
            options={ACTIONS.map((action) => ({ value: action, label: labelAction(action) }))}
          />
          <Select
            label="Channel"
            name="channel"
            value={result.filters.channel}
            options={CHANNELS.map((channel) => ({ value: channel, label: channelLabels[channel] }))}
          />
          <Select
            label="Product"
            name="product"
            value={result.filters.productFit}
            options={PRODUCTS.map((product) => ({ value: product, label: productLabels[product] }))}
          />

          <label>
            <span>Min priority</span>
            <input name="minPriority" type="number" min="0" max="100" defaultValue={result.filters.minPriority} />
          </label>
          <label>
            <span>Limit</span>
            <input name="limit" type="number" min="1" max="200" defaultValue={result.filters.limit} />
          </label>

          <div className="actions">
            <button type="submit">Apply</button>
            <Link href="/crm-vnext/people">Clear</Link>
          </div>
        </form>
      </section>

      <section className="summary" aria-label="People search summary">
        <div>
          <span>Matched</span>
          <strong>{numberFmt.format(result.matched)}</strong>
        </div>
        <div>
          <span>Shown</span>
          <strong>{numberFmt.format(result.returned)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{numberFmt.format(result.total)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>People</h2>
          <span>{numberFmt.format(result.people.length)} rows</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Action</th>
                <th>Channels</th>
                <th>Product</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {result.people.map((person) => (
                <tr key={person.personId}>
                  <td>
                    <Link className="personLink" href={`/crm-vnext/person/${encodeURIComponent(person.personId)}`}>
                      <span className="identity">{identity(person)}</span>
                    </Link>
                    <small>{person.personId}</small>
                  </td>
                  <td>{stageLabels[person.stage]}</td>
                  <td>{person.priorityScore}</td>
                  <td>{labelAction(person.nextAction)}</td>
                  <td>
                    {person.channels.email ? 'email' : '-'} / {person.channels.instagram ? 'ig' : '-'}
                  </td>
                  <td>
                    {productLabels[person.primaryProductFit.key]} {person.primaryProductFit.score}
                  </td>
                  <td>{[person.identities.city, person.identities.country].filter(Boolean).join(', ') || '-'}</td>
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

  .hero,
  .toolbar,
  .summary,
  .panel {
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
  .personLink,
  .actions a,
  .emptyState a {
    color: #253f2b;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink {
    display: inline-block;
    margin: 0 14px 14px 0;
    font-size: 14px;
  }

  .backLink.secondary {
    color: #5d6f61;
  }

  .backLink:hover,
  .personLink:hover,
  .actions a:hover,
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

  .toolbar,
  .panel,
  .emptyState {
    border: 1px solid #ded8cc;
    background: #fffdfa;
    border-radius: 8px;
  }

  .toolbar {
    padding: 16px;
    margin-bottom: 12px;
  }

  form {
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) repeat(6, minmax(120px, 1fr)) auto;
    gap: 10px;
    align-items: end;
  }

  label {
    display: grid;
    gap: 6px;
  }

  label span {
    color: #666b62;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d8d1c5;
    border-radius: 8px;
    background: #fffefa;
    color: #151915;
    font: inherit;
    min-height: 42px;
    padding: 8px 10px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 42px;
  }

  button {
    min-height: 42px;
    border: 0;
    border-radius: 8px;
    background: #253f2b;
    color: #fffdfa;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 8px 16px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .summary div {
    min-height: 76px;
    padding: 14px;
    border: 1px solid #ded8cc;
    border-radius: 8px;
    background: #fffdfa;
    display: grid;
    align-content: space-between;
    gap: 8px;
  }

  .summary span {
    color: #666b62;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
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

  .tableWrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 960px;
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
    max-width: 260px;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  td small {
    display: block;
    margin-top: 4px;
    color: #767b72;
    overflow-wrap: anywhere;
  }

  .emptyState {
    max-width: 720px;
    margin: 96px auto;
    padding: 24px;
    display: grid;
    gap: 12px;
  }

  @media (max-width: 1100px) {
    form {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .query {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 860px) {
    .page {
      padding: 20px;
    }

    .hero,
    form {
      display: grid;
      align-items: start;
    }

    form,
    .summary {
      grid-template-columns: 1fr;
    }

    .source {
      text-align: left;
    }
  }
`;
