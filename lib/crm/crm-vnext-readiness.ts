import { summarizeCommunityInsights } from './community-insights';
import {
  buildCommunityQueues,
  summarizeCommunityQueues,
  type CommunityQueueSummary,
} from './community-queues';
import {
  evaluateCommunityQueueStatus,
  type CommunityQueueStatusReport,
} from './community-queue-status';
import {
  publicLegacyPersonCardsV1Source,
  type LegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from './community-insights-source';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_READINESS_SCHEMA_VERSION = 'crm-vnext-readiness-2026-05-09' as const;

export type CrmVNextReadinessLevel = 'ready' | 'watch' | 'blocked';

export type CrmVNextReadinessCheck = {
  id: string;
  level: CrmVNextReadinessLevel;
  title: string;
  detail: string;
  operatorAction: string | null;
};

export type CrmVNextReadiness = {
  schemaVersion: typeof CRM_VNEXT_READINESS_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_readiness';
  status: CrmVNextReadinessLevel;
  source: PublicLegacyPersonCardsV1Source;
  totals: {
    cards: number;
    emailPresent: number;
    instagramPresent: number;
    omnichannel: number;
  };
  queues: {
    totals: CommunityQueueStatusReport['totals'];
    summaries: CommunityQueueSummary[];
  };
  checks: CrmVNextReadinessCheck[];
  safety: {
    outboundProhibited: true;
    recordMutationProhibited: true;
    localPathsRedacted: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmVNextReadinessUnavailable = {
  schemaVersion: typeof CRM_VNEXT_READINESS_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_readiness';
  status: 'blocked';
  source: {
    kind: 'legacy-person-cards-v1';
    generatedAt: null;
    cards: 0;
  };
  totals: {
    cards: 0;
    emailPresent: 0;
    instagramPresent: 0;
    omnichannel: 0;
  };
  queues: {
    totals: {
      queues: 0;
      notify: 0;
      watch: 0;
      ok: 0;
    };
    summaries: [];
  };
  checks: CrmVNextReadinessCheck[];
  safety: CrmVNextReadiness['safety'];
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const readinessStatus = (checks: CrmVNextReadinessCheck[]): CrmVNextReadinessLevel => {
  if (checks.some((check) => check.level === 'blocked')) return 'blocked';
  if (checks.some((check) => check.level === 'watch')) return 'watch';
  return 'ready';
};

const safety = (): CrmVNextReadiness['safety'] => ({
  outboundProhibited: true,
  recordMutationProhibited: true,
  localPathsRedacted: true,
  allowedUse: [
    'Verify that local CRM vNext read contracts are usable.',
    'Decide whether Mantis should run daily, queue, or decision briefs.',
    'Prepare internal operator notes.',
  ],
  prohibitedActions: [
    'Do not send Telegram, Instagram, email, WhatsApp, or ManyChat messages.',
    'Do not change ManyChat LIVE.',
    'Do not mutate CRM records from readiness output.',
    'Do not change Instagram or MailerLite credentials.',
  ],
});

export const buildCrmVNextReadiness = (
  cards: PersonCardVNext[],
  source: LegacyPersonCardsV1Source,
  options: { now?: string | Date | null } = {},
): CrmVNextReadiness => {
  const generatedAt = isoNow(options.now);
  const summary = summarizeCommunityInsights(cards, { now: generatedAt, topLimit: 0 });
  const queueSummaries = summarizeCommunityQueues(buildCommunityQueues(cards));
  const queueStatus = evaluateCommunityQueueStatus(queueSummaries, { now: generatedAt });
  const checks: CrmVNextReadinessCheck[] = [
    {
      id: 'person_cards_source_loaded',
      level: 'ready',
      title: 'Person cards source loaded',
      detail: `${source.cards} local person cards were loaded from the configured source.`,
      operatorAction: null,
    },
    {
      id: 'cards_available',
      level: cards.length > 0 ? 'ready' : 'blocked',
      title: 'Cards available',
      detail: cards.length > 0 ? 'At least one vNext card is available.' : 'No vNext cards are available.',
      operatorAction: cards.length > 0 ? null : 'Repair or regenerate the local person-cards artifact.',
    },
    {
      id: 'identity_signal_present',
      level: summary.totals.emailPresent > 0 || summary.totals.instagramPresent > 0 ? 'ready' : 'watch',
      title: 'Identity signals present',
      detail: `${summary.totals.emailPresent} email identities and ${summary.totals.instagramPresent} Instagram identities are present.`,
      operatorAction:
        summary.totals.emailPresent > 0 || summary.totals.instagramPresent > 0
          ? null
          : 'Check whether the source artifact lost identity fields.',
    },
    {
      id: 'queue_contract_ready',
      level: queueSummaries.length === 5 ? 'ready' : 'blocked',
      title: 'Queue contract ready',
      detail: `${queueSummaries.length} Mantis queue definitions are available.`,
      operatorAction: queueSummaries.length === 5 ? null : 'Repair queue definitions before operator use.',
    },
    {
      id: 'operator_contracts_local_only',
      level: 'ready',
      title: 'Operator contracts are local only',
      detail: 'Readiness, daily brief, queue, decision brief, and person-card surfaces remain read-only/local.',
      operatorAction: null,
    },
    {
      id: 'outbound_adapters_not_enabled',
      level: 'ready',
      title: 'Outbound adapters not enabled',
      detail: 'No Telegram, Instagram, email, WhatsApp, MailerLite, or ManyChat delivery is part of this readiness surface.',
      operatorAction: null,
    },
  ];

  return {
    schemaVersion: CRM_VNEXT_READINESS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_readiness',
    status: readinessStatus(checks),
    source: publicLegacyPersonCardsV1Source(source),
    totals: {
      cards: summary.totals.cards,
      emailPresent: summary.totals.emailPresent,
      instagramPresent: summary.totals.instagramPresent,
      omnichannel: summary.totals.omnichannel,
    },
    queues: {
      totals: queueStatus.totals,
      summaries: queueSummaries,
    },
    checks,
    safety: safety(),
  };
};

export const buildCrmVNextUnavailableReadiness = (
  options: { now?: string | Date | null; reason?: string | null } = {},
): CrmVNextReadinessUnavailable => {
  const generatedAt = isoNow(options.now);
  return {
    schemaVersion: CRM_VNEXT_READINESS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_readiness',
    status: 'blocked',
    source: {
      kind: 'legacy-person-cards-v1',
      generatedAt: null,
      cards: 0,
    },
    totals: {
      cards: 0,
      emailPresent: 0,
      instagramPresent: 0,
      omnichannel: 0,
    },
    queues: {
      totals: {
        queues: 0,
        notify: 0,
        watch: 0,
        ok: 0,
      },
      summaries: [],
    },
    checks: [
      {
        id: 'person_cards_source_loaded',
        level: 'blocked',
        title: 'Person cards source unavailable',
        detail: options.reason || 'The local person-cards source could not be loaded.',
        operatorAction: 'Repair or regenerate the local person-cards artifact before running operator briefs.',
      },
    ],
    safety: safety(),
  };
};
