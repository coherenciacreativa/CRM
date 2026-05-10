import {
  buildCrmFactIntakeDraft,
  type CrmFactIntakeInput,
  type CrmFactSourceKind,
} from './crm-vnext-fact-intake';
import {
  appendCrmFactsToStore,
  type CrmFactStoreAppendResult,
} from './crm-vnext-fact-store';
import {
  buildCrmVNextIdentityReview,
  type CrmIdentityReviewReport,
} from './crm-vnext-identity-review';
import {
  buildCrmVNextCardRebuildDiff,
  type CrmCardRebuildDiffReport,
} from './crm-vnext-card-rebuild-diff';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_ACTIVATION_RUN_SCHEMA_VERSION =
  'crm-vnext-activation-run-2026-05-10' as const;

export type CrmActivationRunSafety = {
  outboundProhibited: true;
  cardMutationProhibited: true;
  credentialReadProhibited: true;
  factStoreWriteRequiresExplicitCommit: true;
  allowedUse: string[];
  prohibitedActions: string[];
};

export type CrmActivationRunReport = {
  schemaVersion: typeof CRM_VNEXT_ACTIVATION_RUN_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_activation_run' | 'local_activation_run';
  committed: boolean;
  input: {
    sourceKind: CrmFactSourceKind;
    reporter: string | null;
    channel: string | null;
    approvedBy: string;
  };
  draft: ReturnType<typeof buildCrmFactIntakeDraft>;
  storeAppend: CrmFactStoreAppendResult;
  identityReview: CrmIdentityReviewReport;
  cardDiff: CrmCardRebuildDiffReport;
  summary: {
    linesParsed: number;
    factsParsed: number;
    factsAdded: number;
    duplicatesSkipped: number;
    readyForPreview: number;
    blockedFacts: number;
    cardsWithDiffs: number;
    diffOperations: number;
  };
  nextSteps: string[];
  safety: CrmActivationRunSafety;
};

export type CrmActivationRunInput = CrmFactIntakeInput & {
  cards: PersonCardVNext[];
  approvedBy?: string | null;
  commit?: boolean;
  storePath?: string | null;
  now?: string | Date | null;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const safety = (): CrmActivationRunSafety => ({
  outboundProhibited: true,
  cardMutationProhibited: true,
  credentialReadProhibited: true,
  factStoreWriteRequiresExplicitCommit: true,
  allowedUse: [
    'Run one real or test fact batch through the safe CRM vNext pipeline.',
    'Preview identity matches and card diffs before any card write path exists.',
    'Commit approved facts only to the local Fact Store when explicitly requested.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not send outbound messages.',
    'Do not read, refresh, or change credentials.',
    'Do not call Instagram, MailerLite, ManyChat, WhatsApp, or Telegram APIs.',
  ],
});

const nextStepsFor = (
  report: Pick<CrmActivationRunReport, 'committed' | 'summary'>,
): string[] => {
  const steps: string[] = [];
  if (!report.committed) {
    steps.push('Review the draft first; rerun with explicit commit only for real approved facts.');
  }
  if (report.summary.blockedFacts > 0) {
    steps.push('Resolve identity or business-review blockers before approving any card write policy.');
  }
  if (report.summary.cardsWithDiffs > 0) {
    steps.push('Inspect Card Rebuild Diff and decide whether these changes look correct.');
  }
  if (!steps.length) {
    steps.push('Add a real fact batch to exercise the activation pipeline.');
  }
  return steps;
};

export const buildCrmVNextActivationRun = async (
  input: CrmActivationRunInput,
): Promise<CrmActivationRunReport> => {
  const generatedAt = isoNow(input.observedAt ?? input.now);
  const sourceKind = input.sourceKind ?? 'unknown';
  const reporter = cleanString(input.reporter);
  const channel = cleanString(input.channel);
  const approvedBy = cleanString(input.approvedBy) ?? 'dry-run';
  const committed = Boolean(input.commit);

  const draft = buildCrmFactIntakeDraft({
    text: input.text,
    sourceKind,
    reporter,
    channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
  });
  const storeAppend = await appendCrmFactsToStore({
    facts: draft.facts,
    draft,
    approvedBy,
    commit: committed,
    now: generatedAt,
    storePath: input.storePath,
  });
  const identityReview = buildCrmVNextIdentityReview({
    facts: storeAppend.added,
    cards: input.cards,
    now: generatedAt,
  });
  const cardDiff = buildCrmVNextCardRebuildDiff({
    review: identityReview,
    cards: input.cards,
    now: generatedAt,
  });

  const summary = {
    linesParsed: draft.summary.linesParsed,
    factsParsed: draft.summary.facts,
    factsAdded: storeAppend.added.length,
    duplicatesSkipped: storeAppend.duplicatesSkipped.length,
    readyForPreview: identityReview.summary.readyForPreview,
    blockedFacts:
      identityReview.summary.needsIdentityReview
      + identityReview.summary.needsBusinessReview
      + identityReview.summary.unmatched,
    cardsWithDiffs: cardDiff.summary.cardsWithDiffs,
    diffOperations: cardDiff.summary.operations,
  };

  const report: CrmActivationRunReport = {
    schemaVersion: CRM_VNEXT_ACTIVATION_RUN_SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_activation_run' : 'dry_run_activation_run',
    committed,
    input: {
      sourceKind,
      reporter,
      channel,
      approvedBy,
    },
    draft,
    storeAppend,
    identityReview,
    cardDiff,
    summary,
    nextSteps: [],
    safety: safety(),
  };
  report.nextSteps = nextStepsFor(report);
  return report;
};
