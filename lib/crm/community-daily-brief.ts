import {
  summarizeCommunityInsights,
  type CommunityInsightsSummary,
} from './community-insights';
import {
  buildCommunityQueueBrief,
  type CommunityQueueBrief,
} from './community-queue-briefs';
import {
  buildCommunityQueues,
  summarizeCommunityQueues,
  type CommunityQueueId,
  type CommunityQueueSummary,
} from './community-queues';
import {
  evaluateCommunityQueueStatus,
  type CommunityQueuePreviousSnapshot,
  type CommunityQueueStatusReport,
} from './community-queue-status';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityDailyBriefOptions = {
  now?: string | Date | null;
  previousMatched?: CommunityQueuePreviousSnapshot;
  focusQueueLimit?: number | null;
  peoplePerQueue?: number | null;
};

export type CommunityDailyBriefHighlight = {
  code: string;
  level: 'info' | 'watch' | 'notify';
  title: string;
  detail: string;
};

export type CommunityDailyBriefNextStep = {
  code: string;
  priority: 'low' | 'medium' | 'high';
  owner: 'mantis' | 'alejandro' | 'human_team';
  action: string;
  requiresApproval: boolean;
};

export type CommunityDailyBrief = {
  generatedAt: string;
  mode: 'read_only_daily_brief';
  summary: CommunityInsightsSummary;
  queues: {
    totals: CommunityQueueStatusReport['totals'];
    summaries: CommunityQueueSummary[];
    status: CommunityQueueStatusReport;
  };
  highlights: CommunityDailyBriefHighlight[];
  nextSteps: CommunityDailyBriefNextStep[];
  focusQueues: CommunityQueueBrief[];
  safety: {
    outboundProhibited: true;
    recordMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanLimit = (value: number | null | undefined, fallback: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.round(value)));
};

const pct = (value: number, total: number): number => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const chooseFocusQueueIds = (
  status: CommunityQueueStatusReport,
  summaries: CommunityQueueSummary[],
  limit: number,
): CommunityQueueId[] => {
  const matchedById = new Map(summaries.map((queue) => [queue.id, queue.counts.matched]));
  return status.statuses
    .filter((item) => item.level !== 'ok' || item.matched > 0)
    .sort(
      (a, b) =>
        Number(b.level === 'notify') - Number(a.level === 'notify')
        || Number(b.level === 'watch') - Number(a.level === 'watch')
        || (matchedById.get(b.id) ?? 0) - (matchedById.get(a.id) ?? 0)
        || a.id.localeCompare(b.id),
    )
    .slice(0, limit)
    .map((item) => item.id);
};

const buildHighlights = (
  summary: CommunityInsightsSummary,
  status: CommunityQueueStatusReport,
): CommunityDailyBriefHighlight[] => {
  const total = summary.totals.cards;
  const notifyQueues = status.statuses.filter((item) => item.level === 'notify');
  const watchQueues = status.statuses.filter((item) => item.level === 'watch');

  const highlights: CommunityDailyBriefHighlight[] = [
    {
      code: 'community_size',
      level: 'info',
      title: 'Community base',
      detail: `${total} local person cards; email coverage ${pct(summary.totals.emailPresent, total)}%, Instagram coverage ${pct(summary.totals.instagramPresent, total)}%.`,
    },
    {
      code: 'omnichannel_identity',
      level: summary.totals.omnichannel < 20 ? 'watch' : 'info',
      title: 'Omnichannel identity',
      detail: `${summary.totals.omnichannel} people are currently linked across email and Instagram.`,
    },
  ];

  if (summary.identityGaps.missingEmailWithInstagram > 0) {
    highlights.push({
      code: 'ig_email_gap',
      level: 'watch',
      title: 'Instagram to email bridge',
      detail: `${summary.identityGaps.missingEmailWithInstagram} Instagram-known people still have no email captured.`,
    });
  }

  if (summary.identityGaps.missingInstagramWithEmail > 0) {
    highlights.push({
      code: 'email_ig_gap',
      level: 'watch',
      title: 'Identity stitching backlog',
      detail: `${summary.identityGaps.missingInstagramWithEmail} email-known people are missing Instagram identity.`,
    });
  }

  if (notifyQueues.length > 0) {
    highlights.push({
      code: 'queue_notify',
      level: 'notify',
      title: 'Decision needed',
      detail: `${notifyQueues.length} queue(s) require explicit review before any next step.`,
    });
  } else {
    highlights.push({
      code: 'queue_status',
      level: watchQueues.length > 0 ? 'watch' : 'info',
      title: 'Queue status',
      detail: `${status.totals.notify} notify, ${status.totals.watch} watch, ${status.totals.ok} ok.`,
    });
  }

  return highlights;
};

const buildNextSteps = (
  summary: CommunityInsightsSummary,
  status: CommunityQueueStatusReport,
): CommunityDailyBriefNextStep[] => {
  const steps: CommunityDailyBriefNextStep[] = [];
  const notifyQueues = status.statuses.filter((item) => item.shouldAlertAlejandro);

  if (notifyQueues.length > 0) {
    steps.push({
      code: 'prepare_human_decision_brief',
      priority: 'high',
      owner: 'mantis',
      action: 'Prepare a concise decision brief for Alejandro from notify queues; do not send outreach.',
      requiresApproval: true,
    });
  }

  if (summary.identityGaps.missingEmailWithInstagram > 0) {
    steps.push({
      code: 'plan_email_capture',
      priority: 'medium',
      owner: 'mantis',
      action: 'Use the IG without email queue to plan a safe email-capture strategy around the existing onboarding flow.',
      requiresApproval: true,
    });
  }

  if (summary.identityGaps.missingInstagramWithEmail > 0) {
    steps.push({
      code: 'plan_identity_stitching',
      priority: 'medium',
      owner: 'mantis',
      action: 'Keep identity stitching as enrichment work for future matching or human-assistant reporting.',
      requiresApproval: false,
    });
  }

  if (summary.nextActions.nurture_by_email > 0) {
    steps.push({
      code: 'email_nurture_segment',
      priority: 'low',
      owner: 'mantis',
      action: 'Review email-engaged people as a possible newsletter/community nurture segment.',
      requiresApproval: false,
    });
  }

  return steps;
};

export const buildCommunityDailyBrief = (
  cards: PersonCardVNext[],
  options: CommunityDailyBriefOptions = {},
): CommunityDailyBrief => {
  const generatedAt = isoNow(options.now);
  const focusQueueLimit = cleanLimit(options.focusQueueLimit, 3, 5);
  const peoplePerQueue = cleanLimit(options.peoplePerQueue, 3, 10);
  const summary = summarizeCommunityInsights(cards, {
    now: generatedAt,
    topLimit: 8,
  });
  const queueResults = buildCommunityQueues(cards);
  const queueSummaries = summarizeCommunityQueues(queueResults);
  const queueStatus = evaluateCommunityQueueStatus(queueSummaries, {
    now: generatedAt,
    previousMatched: options.previousMatched,
  });
  const focusQueueIds = chooseFocusQueueIds(queueStatus, queueSummaries, focusQueueLimit);

  return {
    generatedAt,
    mode: 'read_only_daily_brief',
    summary,
    queues: {
      totals: queueStatus.totals,
      summaries: queueSummaries,
      status: queueStatus,
    },
    highlights: buildHighlights(summary, queueStatus),
    nextSteps: buildNextSteps(summary, queueStatus),
    focusQueues: focusQueueIds.map((queueId) =>
      buildCommunityQueueBrief(cards, queueId, {
        now: generatedAt,
        previousMatched: options.previousMatched,
        limit: peoplePerQueue,
      }),
    ),
    safety: {
      outboundProhibited: true,
      recordMutationProhibited: true,
      allowedUse: [
        'Read internal community state.',
        'Prepare operator notes.',
        'Plan safe follow-up decisions.',
      ],
      prohibitedActions: [
        'Do not send Instagram messages.',
        'Do not send email or WhatsApp messages.',
        'Do not change ManyChat LIVE.',
        'Do not mutate CRM records.',
        'Do not change Instagram, MailerLite, or outbound-channel credentials.',
      ],
    },
  };
};
