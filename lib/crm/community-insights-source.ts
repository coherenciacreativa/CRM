import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  summarizeLegacyPersonCardsV1AsCommunityInsights,
  type CommunityInsightsOptions,
  type CommunityInsightsSummary,
} from './community-insights';
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

export type CommunityInsightsSourceResult = {
  ok: true;
  source: LegacyPersonCardsV1Source;
  summary: CommunityInsightsSummary;
};

export type LegacyPersonCardsV1Source = {
  kind: 'legacy-person-cards-v1';
  path: string;
  generatedAt: string | null;
  cards: number;
};

export type PublicLegacyPersonCardsV1Source = Omit<LegacyPersonCardsV1Source, 'path'>;

export type PersonCardsVNextSourceResult = {
  ok: true;
  source: LegacyPersonCardsV1Source;
  cards: PersonCardVNext[];
};

export type PersonCardVNextSourceResult = {
  ok: true;
  source: LegacyPersonCardsV1Source;
  card: PersonCardVNext | null;
};

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

const sourceFromPayload = (
  payload: LegacyPersonCardsV1Payload,
  sourcePath: string,
): LegacyPersonCardsV1Source => ({
  kind: 'legacy-person-cards-v1',
  path: sourcePath,
  generatedAt: getString(payload.generatedAt),
  cards: Array.isArray(payload.cards) ? payload.cards.length : 0,
});

export const publicLegacyPersonCardsV1Source = (
  source: LegacyPersonCardsV1Source,
): PublicLegacyPersonCardsV1Source => ({
  kind: source.kind,
  generatedAt: source.generatedAt,
  cards: source.cards,
});

export const resolveLegacyPersonCardsV1Path = (filePath?: string | null): string =>
  filePath || process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;

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
): PersonCardsVNextSourceResult => {
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
): PersonCardVNextSourceResult => {
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
): Promise<PersonCardsVNextSourceResult> => {
  const jsonText = await readFile(filePath, 'utf8');
  return parseLegacyPersonCardsV1AsPersonCards(jsonText, filePath, options);
};

export const loadLegacyPersonCardV1ByPersonId = async (
  personId: string,
  filePath = resolveLegacyPersonCardsV1Path(),
  options: CommunityInsightsOptions = {},
): Promise<PersonCardVNextSourceResult> => {
  const jsonText = await readFile(filePath, 'utf8');
  return parseLegacyPersonCardV1ByPersonId(jsonText, filePath, personId, options);
};
