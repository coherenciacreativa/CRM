import type {
  CommunityQueueId,
  CommunityQueueSummary,
} from './community-queues';

export type CommunityQueueStatusLevel = 'ok' | 'watch' | 'notify';

export type CommunityQueueStatusPolicy = {
  queueId: CommunityQueueId;
  checkCadenceHours: number;
  watchWhenMatchedAtLeast?: number;
  notifyWhenMatchedAtLeast?: number;
  notifyWhenDeltaAtLeast?: number;
  notifyOnAnyMatch?: boolean;
  operatorAction: string;
  alertAction: string | null;
};

export type CommunityQueuePreviousSnapshot = Partial<Record<CommunityQueueId, number>>;

export type CommunityQueueStatus = {
  id: CommunityQueueId;
  title: string;
  level: CommunityQueueStatusLevel;
  matched: number;
  returned: number;
  deltaMatched: number | null;
  checkCadenceHours: number;
  shouldAlertAlejandro: boolean;
  reason: string;
  operatorAction: string;
  alertAction: string | null;
};

export type CommunityQueueStatusReport = {
  generatedAt: string;
  totals: {
    queues: number;
    notify: number;
    watch: number;
    ok: number;
  };
  statuses: CommunityQueueStatus[];
};

export const COMMUNITY_QUEUE_STATUS_POLICIES: CommunityQueueStatusPolicy[] = [
  {
    queueId: 'ig_without_email',
    checkCadenceHours: 6,
    watchWhenMatchedAtLeast: 1,
    notifyWhenMatchedAtLeast: 150,
    notifyWhenDeltaAtLeast: 25,
    operatorAction: 'Review volume and spot-check profiles before planning any email-capture move.',
    alertAction: 'Ask Alejandro only if volume jumps or a campaign decision is needed.',
  },
  {
    queueId: 'email_engaged',
    checkCadenceHours: 24,
    watchWhenMatchedAtLeast: 10,
    notifyWhenMatchedAtLeast: 75,
    notifyWhenDeltaAtLeast: 25,
    operatorAction: 'Use for newsletter/community nurture planning; no direct outreach without approval.',
    alertAction: 'Ask Alejandro only if a sizeable engaged segment emerges.',
  },
  {
    queueId: 'human_review_required',
    checkCadenceHours: 6,
    notifyOnAnyMatch: true,
    operatorAction: 'Hold automation and prepare a concise review list.',
    alertAction: 'Alert Alejandro because these rows require human review before any outreach.',
  },
  {
    queueId: 'identity_stitching',
    checkCadenceHours: 24,
    watchWhenMatchedAtLeast: 1,
    notifyWhenDeltaAtLeast: 100,
    operatorAction: 'Treat as enrichment backlog for future matching or human-assistant reporting.',
    alertAction: 'Ask Alejandro only if a major identity backlog change needs prioritization.',
  },
  {
    queueId: 'commercial_follow_up',
    checkCadenceHours: 6,
    notifyOnAnyMatch: true,
    operatorAction: 'Prepare a decision brief; do not send anything.',
    alertAction: 'Alert Alejandro because commercial follow-up needs explicit human decision.',
  },
];

const policyFor = (queueId: CommunityQueueId): CommunityQueueStatusPolicy =>
  COMMUNITY_QUEUE_STATUS_POLICIES.find((policy) => policy.queueId === queueId) ?? {
    queueId,
    checkCadenceHours: 24,
    operatorAction: 'Monitor queue count.',
    alertAction: null,
  };

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const evaluateLevel = (
  queue: CommunityQueueSummary,
  policy: CommunityQueueStatusPolicy,
  deltaMatched: number | null,
): CommunityQueueStatusLevel => {
  if (policy.notifyOnAnyMatch && queue.counts.matched > 0) return 'notify';
  if (policy.notifyWhenMatchedAtLeast !== undefined && queue.counts.matched >= policy.notifyWhenMatchedAtLeast) {
    return 'notify';
  }
  if (deltaMatched !== null && policy.notifyWhenDeltaAtLeast !== undefined && deltaMatched >= policy.notifyWhenDeltaAtLeast) {
    return 'notify';
  }
  if (policy.watchWhenMatchedAtLeast !== undefined && queue.counts.matched >= policy.watchWhenMatchedAtLeast) {
    return 'watch';
  }
  if (deltaMatched !== null && deltaMatched > 0) return 'watch';
  return 'ok';
};

const reasonFor = (
  queue: CommunityQueueSummary,
  policy: CommunityQueueStatusPolicy,
  level: CommunityQueueStatusLevel,
  deltaMatched: number | null,
): string => {
  if (level === 'notify') {
    if (policy.notifyOnAnyMatch && queue.counts.matched > 0) {
      return `${queue.counts.matched} rows require explicit human review or decision.`;
    }
    if (deltaMatched !== null && policy.notifyWhenDeltaAtLeast !== undefined && deltaMatched >= policy.notifyWhenDeltaAtLeast) {
      return `Queue grew by ${deltaMatched} rows since the previous snapshot.`;
    }
    return `${queue.counts.matched} rows reached the notification threshold.`;
  }

  if (level === 'watch') {
    if (deltaMatched !== null && deltaMatched > 0) return `Queue grew by ${deltaMatched} rows.`;
    return `${queue.counts.matched} rows should be monitored on the normal cadence.`;
  }

  return 'No operator action is needed right now.';
};

export const evaluateCommunityQueueStatus = (
  queues: CommunityQueueSummary[],
  options: {
    now?: string | Date | null;
    previousMatched?: CommunityQueuePreviousSnapshot;
  } = {},
): CommunityQueueStatusReport => {
  const statuses = queues.map((queue) => {
    const policy = policyFor(queue.id);
    const previous = options.previousMatched?.[queue.id];
    const deltaMatched = previous === undefined ? null : queue.counts.matched - previous;
    const level = evaluateLevel(queue, policy, deltaMatched);
    const shouldAlertAlejandro = level === 'notify' && Boolean(policy.alertAction);

    return {
      id: queue.id,
      title: queue.title,
      level,
      matched: queue.counts.matched,
      returned: queue.counts.returned,
      deltaMatched,
      checkCadenceHours: policy.checkCadenceHours,
      shouldAlertAlejandro,
      reason: reasonFor(queue, policy, level, deltaMatched),
      operatorAction: policy.operatorAction,
      alertAction: shouldAlertAlejandro ? policy.alertAction : null,
    };
  });

  return {
    generatedAt: isoNow(options.now),
    totals: {
      queues: statuses.length,
      notify: statuses.filter((status) => status.level === 'notify').length,
      watch: statuses.filter((status) => status.level === 'watch').length,
      ok: statuses.filter((status) => status.level === 'ok').length,
    },
    statuses,
  };
};
