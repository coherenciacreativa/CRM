import { access, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  summarizeCommunityInsights,
  summarizeLegacyPersonCardsV1AsCommunityInsights,
  type CommunityInsightsOptions,
  type CommunityInsightsSummary,
} from './community-insights';
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
  type CrmVNextPersonCardStore,
} from './crm-vnext-card-write-apply';
import {
  buildPersonCardVNextFromLegacyV1,
  buildPersonCardsVNextFromLegacyV1Payload,
  type LegacyPersonCardV1,
  type LegacyPersonCardsV1Payload,
} from './legacy-person-card-v1-adapter';
import type { PersonCardVNext } from './person-card-vnext';

export const DEFAULT_LEGACY_PERSON_CARDS_V1_PATH = join(
  homedir(),
  '.openclaw-lakshmi',
  'workspace',
  'memory',
  'projects',
  'crm-memory-fabric',
  'ops',
  'person-cards-v1.json',
);

export const DEFAULT_CRM_VNEXT_PERSON_CARD_STORE_PATH = join(
  process.cwd(),
  '.crm-vnext',
  'person-card-store',
  'person-cards-vnext.json',
);

export type CommunityInsightsSourceResult = {
  ok: true;
  source: PersonCardsVNextSource;
  summary: CommunityInsightsSummary;
};

export type LegacyPersonCardsV1Source = {
  kind: 'legacy-person-cards-v1';
  path: string;
  generatedAt: string | null;
  cards: number;
};

export type PublicLegacyPersonCardsV1Source = Omit<LegacyPersonCardsV1Source, 'path'>;

export type VNextPersonCardStoreSource = {
  kind: 'vnext-person-card-store';
  path: string;
  generatedAt: string | null;
  cards: number;
  base: CrmVNextPersonCardStore['base'] | null;
};

export type PersonCardsVNextSource = LegacyPersonCardsV1Source | VNextPersonCardStoreSource;

export type PublicVNextPersonCardStoreSource = Omit<VNextPersonCardStoreSource, 'path'>;

export type PublicPersonCardsVNextSource =
  | PublicLegacyPersonCardsV1Source
  | PublicVNextPersonCardStoreSource;

export type LegacyPersonCardsV1AsPersonCardsResult = {
  ok: true;
  source: LegacyPersonCardsV1Source;
  cards: PersonCardVNext[];
};

export type VNextPersonCardStoreAsPersonCardsResult = {
  ok: true;
  source: VNextPersonCardStoreSource;
  cards: PersonCardVNext[];
};

export type PersonCardsVNextSourceResult =
  | LegacyPersonCardsV1AsPersonCardsResult
  | VNextPersonCardStoreAsPersonCardsResult;

export type LegacyPersonCardV1SourceResult = {
  ok: true;
  source: LegacyPersonCardsV1Source;
  card: PersonCardVNext | null;
};

export type VNextPersonCardStoreByIdResult = {
  ok: true;
  source: VNextPersonCardStoreSource;
  card: PersonCardVNext | null;
};

export type PersonCardVNextSourceResult =
  | LegacyPersonCardV1SourceResult
  | VNextPersonCardStoreByIdResult;

const getString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const parseLegacyPersonCardsV1Payload = (jsonText: string): LegacyPersonCardsV1Payload => {
  let payload: LegacyPersonCardsV1Payload;
  try {
    payload = JSON.parse(jsonText) as LegacyPersonCardsV1Payload;
  } catch {
    throw new Error('invalid_legacy_person_cards_json');
  }

  if (!payload || !Array.isArray(payload.cards)) {
    throw new Error('invalid_legacy_person_cards_payload');
  }

  return payload;
};

const parseCrmVNextPersonCardStorePayload = (jsonText: string): CrmVNextPersonCardStore => {
  let payload: CrmVNextPersonCardStore;
  try {
    payload = JSON.parse(jsonText) as CrmVNextPersonCardStore;
  } catch {
    throw new Error('invalid_vnext_person_card_store_json');
  }

  if (
    !payload
    || payload.schemaVersion !== CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION
    || !Array.isArray(payload.cards)
  ) {
    throw new Error('invalid_vnext_person_card_store_payload');
  }

  return payload;
};

const sourceFromPayload = (
  payload: LegacyPersonCardsV1Payload,
  sourcePath: string,
): LegacyPersonCardsV1Source => ({
  kind: 'legacy-person-cards-v1',
  path: sourcePath,
  generatedAt: getString(payload.generatedAt),
  cards: Array.isArray(payload.cards) ? payload.cards.length : 0,
});

const sourceFromStore = (
  payload: CrmVNextPersonCardStore,
  sourcePath: string,
): VNextPersonCardStoreSource => ({
  kind: 'vnext-person-card-store',
  path: sourcePath,
  generatedAt: getString(payload.generatedAt),
  cards: Array.isArray(payload.cards) ? payload.cards.length : 0,
  base: payload.base ?? null,
});

export const publicLegacyPersonCardsV1Source = (
  source: LegacyPersonCardsV1Source,
): PublicLegacyPersonCardsV1Source => ({
  kind: source.kind,
  generatedAt: source.generatedAt,
  cards: source.cards,
});

export const publicPersonCardsVNextSource = (
  source: PersonCardsVNextSource,
): PublicPersonCardsVNextSource => {
  if (source.kind === 'vnext-person-card-store') {
    return {
      kind: source.kind,
      generatedAt: source.generatedAt,
      cards: source.cards,
      base: source.base,
    };
  }
  return publicLegacyPersonCardsV1Source(source);
};

export const resolveLegacyPersonCardsV1Path = (filePath?: string | null): string =>
  filePath || process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;

export const resolveCrmVNextPersonCardStorePath = (filePath?: string | null): string =>
  filePath || process.env.CRM_VNEXT_PERSON_CARD_STORE_PATH || DEFAULT_CRM_VNEXT_PERSON_CARD_STORE_PATH;

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const parseLegacyPersonCardsV1Insights = (
  jsonText: string,
  sourcePath: string,
  options: CommunityInsightsOptions = {},
): CommunityInsightsSourceResult => {
  const payload = parseLegacyPersonCardsV1Payload(jsonText);

  const summary = summarizeLegacyPersonCardsV1AsCommunityInsights(payload, options);
  return {
    ok: true,
    source: sourceFromPayload(payload, sourcePath),
    summary,
  };
};

export const parseLegacyPersonCardsV1AsPersonCards = (
  jsonText: string,
  sourcePath: string,
  options: CommunityInsightsOptions = {},
): LegacyPersonCardsV1AsPersonCardsResult => {
  const payload = parseLegacyPersonCardsV1Payload(jsonText);
  return {
    ok: true,
    source: sourceFromPayload(payload, sourcePath),
    cards: buildPersonCardsVNextFromLegacyV1Payload(payload, { now: options.now }),
  };
};

export const parseLegacyPersonCardV1ByPersonId = (
  jsonText: string,
  sourcePath: string,
  personId: string,
  options: CommunityInsightsOptions = {},
): LegacyPersonCardV1SourceResult => {
  const stablePersonId = getString(personId);
  if (!stablePersonId) throw new Error('invalid_person_id');

  const payload = parseLegacyPersonCardsV1Payload(jsonText);
  const legacyCards = payload.cards as LegacyPersonCardV1[];
  const legacyCard = legacyCards.find(
    (card) => getString((card as LegacyPersonCardV1).personId) === stablePersonId,
  );

  return {
    ok: true,
    source: sourceFromPayload(payload, sourcePath),
    card: legacyCard
      ? buildPersonCardVNextFromLegacyV1(legacyCard, {
          now: options.now ?? getString(payload.generatedAt),
        })
      : null,
  };
};

export const parseCrmVNextPersonCardStoreAsPersonCards = (
  jsonText: string,
  sourcePath: string,
): VNextPersonCardStoreAsPersonCardsResult => {
  const payload = parseCrmVNextPersonCardStorePayload(jsonText);
  return {
    ok: true,
    source: sourceFromStore(payload, sourcePath),
    cards: payload.cards,
  };
};

export const parseCrmVNextPersonCardStoreInsights = (
  jsonText: string,
  sourcePath: string,
  options: CommunityInsightsOptions = {},
): CommunityInsightsSourceResult => {
  const payload = parseCrmVNextPersonCardStoreAsPersonCards(jsonText, sourcePath);
  return {
    ok: true,
    source: payload.source,
    summary: summarizeCommunityInsights(payload.cards, options),
  };
};

export const parseCrmVNextPersonCardStoreByPersonId = (
  jsonText: string,
  sourcePath: string,
  personId: string,
): VNextPersonCardStoreByIdResult => {
  const stablePersonId = getString(personId);
  if (!stablePersonId) throw new Error('invalid_person_id');

  const payload = parseCrmVNextPersonCardStoreAsPersonCards(jsonText, sourcePath);
  return {
    ok: true,
    source: payload.source,
    card: payload.cards.find((card) => getString(card.personId) === stablePersonId) ?? null,
  };
};

export const loadLegacyPersonCardsV1Insights = async (
  filePath = resolveLegacyPersonCardsV1Path(),
  options: CommunityInsightsOptions = {},
): Promise<CommunityInsightsSourceResult> => {
  const jsonText = await readFile(filePath, 'utf8');
  return parseLegacyPersonCardsV1Insights(jsonText, filePath, options);
};

export const loadLegacyPersonCardsV1AsPersonCards = async (
  filePath = resolveLegacyPersonCardsV1Path(),
  options: CommunityInsightsOptions = {},
): Promise<LegacyPersonCardsV1AsPersonCardsResult> => {
  const jsonText = await readFile(filePath, 'utf8');
  return parseLegacyPersonCardsV1AsPersonCards(jsonText, filePath, options);
};

export const loadLegacyPersonCardV1ByPersonId = async (
  personId: string,
  filePath = resolveLegacyPersonCardsV1Path(),
  options: CommunityInsightsOptions = {},
): Promise<LegacyPersonCardV1SourceResult> => {
  const jsonText = await readFile(filePath, 'utf8');
  return parseLegacyPersonCardV1ByPersonId(jsonText, filePath, personId, options);
};

export const loadPersonCardsVNext = async (
  options: {
    legacyPath?: string | null;
    cardStorePath?: string | null;
    preferStore?: boolean | null;
    now?: string | Date | null;
  } = {},
): Promise<PersonCardsVNextSourceResult> => {
  const preferStore = options.preferStore !== false;
  const storePath = resolveCrmVNextPersonCardStorePath(options.cardStorePath);
  if (preferStore && await fileExists(storePath)) {
    return parseCrmVNextPersonCardStoreAsPersonCards(await readFile(storePath, 'utf8'), storePath);
  }
  return loadLegacyPersonCardsV1AsPersonCards(resolveLegacyPersonCardsV1Path(options.legacyPath), {
    now: options.now,
  });
};

export const loadPersonCardsVNextInsights = async (
  options: {
    legacyPath?: string | null;
    cardStorePath?: string | null;
    preferStore?: boolean | null;
    now?: string | Date | null;
    topLimit?: number;
  } = {},
): Promise<CommunityInsightsSourceResult> => {
  const preferStore = options.preferStore !== false;
  const storePath = resolveCrmVNextPersonCardStorePath(options.cardStorePath);
  if (preferStore && await fileExists(storePath)) {
    return parseCrmVNextPersonCardStoreInsights(await readFile(storePath, 'utf8'), storePath, options);
  }
  return loadLegacyPersonCardsV1Insights(resolveLegacyPersonCardsV1Path(options.legacyPath), options);
};

export const loadPersonCardVNextByPersonId = async (
  personId: string,
  options: {
    legacyPath?: string | null;
    cardStorePath?: string | null;
    preferStore?: boolean | null;
    now?: string | Date | null;
  } = {},
): Promise<PersonCardVNextSourceResult> => {
  const preferStore = options.preferStore !== false;
  const storePath = resolveCrmVNextPersonCardStorePath(options.cardStorePath);
  if (preferStore && await fileExists(storePath)) {
    return parseCrmVNextPersonCardStoreByPersonId(await readFile(storePath, 'utf8'), storePath, personId);
  }
  return loadLegacyPersonCardV1ByPersonId(personId, resolveLegacyPersonCardsV1Path(options.legacyPath), {
    now: options.now,
  });
};
