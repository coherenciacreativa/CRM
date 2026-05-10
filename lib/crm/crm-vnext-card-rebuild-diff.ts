import type { CrmIdentityReviewItem, CrmIdentityReviewReport } from './crm-vnext-identity-review';
import type { PersonCardEvidence, PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_CARD_REBUILD_DIFF_SCHEMA_VERSION =
  'crm-vnext-card-rebuild-diff-2026-05-09' as const;

type ScoringHints = NonNullable<CrmIdentityReviewItem['preview']>['scoringHints'];

export type CrmCardRebuildDiffOperation =
  | {
      op: 'add_evidence';
      path: '/evidence/-';
      value: PersonCardEvidence;
      factIds: string[];
    }
  | {
      op: 'add_tag';
      path: '/future/tags/-';
      value: string;
      factIds: string[];
    }
  | {
      op: 'increment_product';
      path: `/products/${'yogaClasses90d' | 'happyCircle90d' | 'retreatsAttended' | 'purchaseCount'}`;
      before: number;
      after: number;
      delta: number;
      factIds: string[];
    }
  | {
      op: 'set_product_flag';
      path: '/products/activeClient';
      before: boolean;
      after: boolean;
      factIds: string[];
    }
  | {
      op: 'merge_scoring_hint';
      path: '/future/scoringHints';
      value: ScoringHints;
      factIds: string[];
    };

export type CrmCardRebuildDiff = {
  personId: string;
  displayName: string | null;
  sourceFactIds: string[];
  sourceStoredFactIds: string[];
  current: {
    evidenceCount: number;
    products: PersonCardVNext['products'];
    stage: PersonCardVNext['scoring']['stage'];
    priorityScore: number;
    nextAction: PersonCardVNext['nextAction']['code'];
  };
  proposed: {
    evidenceToAdd: PersonCardEvidence[];
    tagsToAdd: string[];
    scoringHints: ScoringHints[];
    productsAfter: PersonCardVNext['products'];
    operations: CrmCardRebuildDiffOperation[];
  };
  safetyNote: string;
};

export type CrmCardRebuildDiffBlockedItem = {
  storedFactId: string;
  factId: string;
  status: CrmIdentityReviewItem['status'];
  reason: string;
  personHint: CrmIdentityReviewItem['fact']['person'];
};

export type CrmCardRebuildDiffSummary = {
  reviewItems: number;
  readyItems: number;
  blockedItems: number;
  cardsWithDiffs: number;
  operations: number;
  evidenceToAdd: number;
  tagsToAdd: number;
};

export type CrmCardRebuildDiffSafety = {
  readOnly: true;
  outboundProhibited: true;
  cardMutationProhibited: true;
  credentialReadProhibited: true;
  allowedUse: string[];
  prohibitedActions: string[];
};

export type CrmCardRebuildDiffReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_REBUILD_DIFF_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_card_rebuild_diff';
  summary: CrmCardRebuildDiffSummary;
  diffs: CrmCardRebuildDiff[];
  blockedItems: CrmCardRebuildDiffBlockedItem[];
  safety: CrmCardRebuildDiffSafety;
};

export type CrmCardRebuildDiffInput = {
  review: CrmIdentityReviewReport;
  cards: PersonCardVNext[];
  now?: string | Date | null;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const add = (left: number, right: number | undefined): number =>
  left + (typeof right === 'number' && Number.isFinite(right) ? Math.max(0, right) : 0);

const uniq = <T>(values: T[]): T[] => Array.from(new Set(values));

const mergeProducts = (
  current: PersonCardVNext['products'],
  hints: ScoringHints[],
): PersonCardVNext['products'] => hints.reduce((products, hint) => ({
  ...products,
  yogaClasses90d: add(products.yogaClasses90d, hint.participation?.yogaClasses90d),
  happyCircle90d: add(products.happyCircle90d, hint.participation?.happyCircle90d),
  retreatsAttended: add(products.retreatsAttended, hint.participation?.retreatsAttended),
  purchaseCount: add(products.purchaseCount, hint.purchases?.purchaseCount),
  activeClient: products.activeClient || Boolean(hint.purchases?.activeClient),
}), { ...current });

const productIncrementOperations = (
  card: PersonCardVNext,
  productsAfter: PersonCardVNext['products'],
  factIds: string[],
): CrmCardRebuildDiffOperation[] => {
  const operations: CrmCardRebuildDiffOperation[] = [];
  const fields: Array<'yogaClasses90d' | 'happyCircle90d' | 'retreatsAttended' | 'purchaseCount'> = [
    'yogaClasses90d',
    'happyCircle90d',
    'retreatsAttended',
    'purchaseCount',
  ];

  for (const field of fields) {
    const before = card.products[field];
    const after = productsAfter[field];
    const delta = after - before;
    if (delta > 0) {
      operations.push({
        op: 'increment_product',
        path: `/products/${field}`,
        before,
        after,
        delta,
        factIds,
      });
    }
  }

  if (!card.products.activeClient && productsAfter.activeClient) {
    operations.push({
      op: 'set_product_flag',
      path: '/products/activeClient',
      before: false,
      after: true,
      factIds,
    });
  }

  return operations;
};

const safety = (): CrmCardRebuildDiffSafety => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  credentialReadProhibited: true,
  allowedUse: [
    'Review proposed person-card changes before any write path exists.',
    'Explain exactly which facts would change which card fields.',
    'Prepare a human-readable approval surface for Alejandro and Mantis.',
  ],
  prohibitedActions: [
    'Do not write rebuilt person cards from this report.',
    'Do not send outbound messages.',
    'Do not read, refresh, or change credentials.',
    'Do not apply diffs that have blocked identity or business review items.',
  ],
});

export const buildCrmVNextCardRebuildDiff = (
  input: CrmCardRebuildDiffInput,
): CrmCardRebuildDiffReport => {
  const generatedAt = isoNow(input.now);
  const cardsById = new Map(input.cards.map((card) => [card.personId, card]));
  const readyItems = input.review.items.filter((item) => item.status === 'ready_for_preview' && item.preview);
  const blockedItems = input.review.items
    .filter((item) => item.status !== 'ready_for_preview')
    .map((item): CrmCardRebuildDiffBlockedItem => ({
      storedFactId: item.storedFactId,
      factId: item.factId,
      status: item.status,
      reason: item.reason,
      personHint: item.fact.person,
    }));

  const byPerson = new Map<string, CrmIdentityReviewItem[]>();
  for (const item of readyItems) {
    const personId = item.preview?.personId;
    if (!personId) continue;
    byPerson.set(personId, [...(byPerson.get(personId) ?? []), item]);
  }

  const diffs = Array.from(byPerson.entries()).flatMap(([personId, items]): CrmCardRebuildDiff[] => {
    const card = cardsById.get(personId);
    if (!card) return [];

    const sourceFactIds = items.map((item) => item.factId);
    const sourceStoredFactIds = items.map((item) => item.storedFactId);
    const evidenceToAdd = items
      .map((item) => item.preview?.proposedEvidence)
      .filter((evidence): evidence is PersonCardEvidence => Boolean(evidence));
    const tagsToAdd = uniq(items.flatMap((item) => item.preview?.proposedTags ?? []));
    const scoringHints = items
      .map((item) => item.preview?.scoringHints)
      .filter((hint): hint is ScoringHints => Boolean(hint));
    const productsAfter = mergeProducts(card.products, scoringHints);

    const operations: CrmCardRebuildDiffOperation[] = [
      ...evidenceToAdd.map((value, index): CrmCardRebuildDiffOperation => ({
        op: 'add_evidence',
        path: '/evidence/-',
        value,
        factIds: [items[index].factId],
      })),
      ...tagsToAdd.map((value): CrmCardRebuildDiffOperation => ({
        op: 'add_tag',
        path: '/future/tags/-',
        value,
        factIds: sourceFactIds,
      })),
      ...productIncrementOperations(card, productsAfter, sourceFactIds),
      ...scoringHints.map((value, index): CrmCardRebuildDiffOperation => ({
        op: 'merge_scoring_hint',
        path: '/future/scoringHints',
        value,
        factIds: [items[index].factId],
      })),
    ];

    return [{
      personId: card.personId,
      displayName: card.displayName,
      sourceFactIds,
      sourceStoredFactIds,
      current: {
        evidenceCount: card.evidence.length,
        products: card.products,
        stage: card.scoring.stage,
        priorityScore: card.scoring.priorityScore,
        nextAction: card.nextAction.code,
      },
      proposed: {
        evidenceToAdd,
        tagsToAdd,
        scoringHints,
        productsAfter,
        operations,
      },
      safetyNote: 'Diff only. No person card file has been rebuilt or written.',
    }];
  }).sort((a, b) => a.personId.localeCompare(b.personId));

  return {
    schemaVersion: CRM_VNEXT_CARD_REBUILD_DIFF_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_card_rebuild_diff',
    summary: {
      reviewItems: input.review.items.length,
      readyItems: readyItems.length,
      blockedItems: blockedItems.length,
      cardsWithDiffs: diffs.length,
      operations: diffs.reduce((sum, diff) => sum + diff.proposed.operations.length, 0),
      evidenceToAdd: diffs.reduce((sum, diff) => sum + diff.proposed.evidenceToAdd.length, 0),
      tagsToAdd: diffs.reduce((sum, diff) => sum + diff.proposed.tagsToAdd.length, 0),
    },
    diffs,
    blockedItems,
    safety: safety(),
  };
};
