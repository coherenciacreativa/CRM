import {
  buildCommunityDailyBrief,
  type CommunityDailyBrief,
} from './community-daily-brief';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
} from './community-insights-source';
import {
  readCommunityQueueSnapshot,
  snapshotToPreviousMatched,
} from './community-queue-snapshots';
import { buildCrmVNextEngagementMovementQueue } from './crm-vnext-engagement-movement-queue';
import {
  buildCrmVNextEngagementResolutionLoop,
} from './crm-vnext-engagement-resolution-loop';

export const CRM_VNEXT_DAILY_OPERATOR_HANDOFF_SCHEMA_VERSION =
  'crm-vnext-daily-operator-handoff-2026-05-21';

type LooseOptions = Record<string, any>;

export type CrmVNextDailyOperatorHandoffTask = {
  taskId: string;
  lane:
    | 'queue_review'
    | 'engagement_context'
    | 'identity_stitching'
    | 'email_capture'
    | 'observation'
    | 'safety';
  priority: 'high' | 'medium' | 'low';
  owner: 'mantis' | 'alejandro' | 'human_team';
  title: string;
  reason: string;
  status: 'ready_internal' | 'needs_approval' | 'observe_only';
  approvalRequired: boolean;
  recommendedSurface: {
    api: string | null;
    command: string | null;
    browserRoute: string | null;
  };
  allowedNow: string[];
  blockedUntilApproval: string[];
};

export type CrmVNextDailyOperatorHandoff = {
  ok: true;
  schemaVersion: typeof CRM_VNEXT_DAILY_OPERATOR_HANDOFF_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_daily_operator_handoff';
  source: {
    dailyBriefGeneratedAt: string;
    cards: number;
    sourceGeneratedAt: string | null;
    engagementRows: number;
    engagementLatestCapturedAt: string | null;
    resolutionLoopIncluded: boolean;
  };
  summary: {
    urgency: 'planning' | 'watch' | 'notify';
    tasks: number;
    highPriority: number;
    approvalBoundaries: number;
    humanAskRecommended: boolean;
    operationsExecuted: 0;
    firstMove: string;
  };
  tasks: CrmVNextDailyOperatorHandoffTask[];
  doNotDo: string[];
  mantisBrief: string;
  safety: {
    localOnly: true;
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    scoreMutationProhibited: true;
    liveApiCallsProhibited: true;
    credentialReadProhibited: true;
  };
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const pct = (value: number, total: number): number => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const addTask = (
  tasks: CrmVNextDailyOperatorHandoffTask[],
  task: CrmVNextDailyOperatorHandoffTask,
) => {
  if (!tasks.some((item) => item.taskId === task.taskId)) tasks.push(task);
};

const sharedAllowed = [
  'Read local CRM artifacts and stored reports.',
  'Prepare internal notes for Mantis/Alejandro.',
  'Ask Alejandro concise context questions when the packet says they are needed.',
];

const sharedBlocked = [
  'Outbound through Instagram, WhatsApp, Telegram, email, ManyChat, or any other channel.',
  'CRM card writes, Fact Store writes, score mutation, or merge operations.',
  'Live API calls, credential changes, or external-source mutations.',
];

const queryFromFilters = (filters: Record<string, unknown> = {}): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params.toString();
};

const firstNotifyQueue = (brief: CommunityDailyBrief) =>
  brief.focusQueues.find((queue) => queue.queue.status?.level === 'notify')?.queue
  ?? brief.queues.summaries.find((queue) =>
    brief.queues.status.statuses.some((status) => status.id === queue.id && status.level === 'notify'),
  )
  ?? null;

const buildTasks = (
  brief: CommunityDailyBrief,
  resolutionLoop: any | null,
): CrmVNextDailyOperatorHandoffTask[] => {
  const tasks: CrmVNextDailyOperatorHandoffTask[] = [];
  const notifyQueue = firstNotifyQueue(brief);
  const engagement = brief.engagement;

  if (notifyQueue) {
    addTask(tasks, {
      taskId: 'prepare_notify_queue_decision_brief',
      lane: 'queue_review',
      priority: 'high',
      owner: 'mantis',
      title: `Prepare decision brief for ${notifyQueue.title}`,
      reason: `${notifyQueue.counts.matched} contact(s) are in a notify-level CRM queue.`,
      status: 'ready_internal',
      approvalRequired: true,
      recommendedSurface: {
        api: `/api/crm-vnext/community-decision-brief?queueId=${notifyQueue.id}&limit=5`,
        command: `npm run crm:vnext:decision-brief -- --queue-id ${notifyQueue.id} --limit 5`,
        browserRoute: `/crm-vnext/people?${queryFromFilters(notifyQueue.filters as Record<string, unknown>)}`,
      },
      allowedNow: [
        'Prepare a no-send decision brief.',
        'Review why the queue is notify-level.',
        'Ask Alejandro only for the decision needed by the brief.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  }

  if (resolutionLoop?.summary?.questions > 0) {
    addTask(tasks, {
      taskId: 'ask_compact_engagement_context',
      lane: 'engagement_context',
      priority: resolutionLoop.summary.highPriority > 0 ? 'high' : 'medium',
      owner: 'mantis',
      title: 'Ask compact engagement context questions',
      reason: `${resolutionLoop.summary.questions} engagement question(s) are ready; ${resolutionLoop.summary.broadQuestionsSuppressed ?? 0} broad question(s) were suppressed as redundant.`,
      status: 'ready_internal',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/engagement-resolution-loop?limit=5',
        command: 'npm run crm:vnext:engagement-resolution-loop -- --limit 5 --out <json> --markdown-out <md>',
        browserRoute: null,
      },
      allowedNow: [
        'Ask one person at a time in natural language.',
        'Accept short text or audio-transcribed answers.',
        'Run human-enrichment-response-evidence after answers are saved.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  } else if ((engagement?.byAction.review_reply_context ?? 0) > 0) {
    addTask(tasks, {
      taskId: 'run_engagement_resolution_loop',
      lane: 'engagement_context',
      priority: 'medium',
      owner: 'mantis',
      title: 'Run engagement resolution loop',
      reason: `${engagement?.byAction.review_reply_context ?? 0} reply-context action(s) need interpretation before asking Alejandro broad questions.`,
      status: 'ready_internal',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/engagement-resolution-loop?limit=5',
        command: 'npm run crm:vnext:engagement-resolution-loop -- --limit 5 --out <json> --markdown-out <md>',
        browserRoute: null,
      },
      allowedNow: sharedAllowed,
      blockedUntilApproval: sharedBlocked,
    });
  }

  if ((resolutionLoop?.summary?.broadQuestionsSuppressed ?? 0) > 0) {
    addTask(tasks, {
      taskId: 'review_context_covered_signals_internally',
      lane: 'engagement_context',
      priority: 'low',
      owner: 'mantis',
      title: 'Review context-covered signals internally',
      reason: `${resolutionLoop.summary.broadQuestionsSuppressed} candidate(s) already have enough human context; avoid redundant questions.`,
      status: 'ready_internal',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/engagement-resolution-loop?includeContextCoveredQuestions=1',
        command: 'npm run crm:vnext:engagement-resolution-loop -- --include-context-covered-questions',
        browserRoute: null,
      },
      allowedNow: [
        'Use stored human context before asking Alejandro again.',
        'Escalate only a minimal decision if the new signal changes interpretation.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  }

  if ((engagement?.byAction.stitch_identity ?? 0) > 0 || (engagement?.totals.unmatchedRows ?? 0) > 0) {
    addTask(tasks, {
      taskId: 'stitch_unmatched_engagement_before_interpretation',
      lane: 'identity_stitching',
      priority: 'high',
      owner: 'mantis',
      title: 'Stitch unmatched engagement first',
      reason: `${engagement?.totals.unmatchedRows ?? 0} unmatched engagement row(s) cannot safely affect cards until identity is resolved.`,
      status: 'ready_internal',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/engagement-movement-queue',
        command: 'npm run crm:vnext:engagement-movement-queue',
        browserRoute: '/crm-vnext/engagement-movement',
      },
      allowedNow: [
        'Run read-only identity stitching and source recovery.',
        'Prepare evidence packets for later approval.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  }

  if (brief.summary.identityGaps.missingInstagramWithEmail > 0) {
    addTask(tasks, {
      taskId: 'plan_identity_stitching_backlog',
      lane: 'identity_stitching',
      priority: 'medium',
      owner: 'mantis',
      title: 'Plan identity stitching backlog',
      reason: `${brief.summary.identityGaps.missingInstagramWithEmail} email-known people are missing Instagram identity.`,
      status: 'ready_internal',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/community-queue-brief?queueId=identity_stitching&limit=10',
        command: 'npm run crm:vnext:decision-brief -- --queue-id identity_stitching --limit 10',
        browserRoute: '/crm-vnext/people?action=stitch_identity',
      },
      allowedNow: [
        'Batch read-only stitching by cohort or source.',
        'Prefer high-signal groups before broad low-value matching.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  }

  if (brief.summary.identityGaps.missingEmailWithInstagram > 0) {
    addTask(tasks, {
      taskId: 'plan_instagram_email_bridge',
      lane: 'email_capture',
      priority: 'medium',
      owner: 'mantis',
      title: 'Plan Instagram-to-email bridge',
      reason: `${brief.summary.identityGaps.missingEmailWithInstagram} Instagram-known people still have no email captured.`,
      status: 'ready_internal',
      approvalRequired: true,
      recommendedSurface: {
        api: '/api/crm-vnext/community-queue-brief?queueId=ig_without_email&limit=10',
        command: 'npm run crm:vnext:decision-brief -- --queue-id ig_without_email --limit 10',
        browserRoute: '/crm-vnext/people?action=ask_for_email',
      },
      allowedNow: [
        'Inspect official-flow source recovery before asking Alejandro.',
        'Prepare a no-send capture strategy around existing onboarding.',
      ],
      blockedUntilApproval: [
        ...sharedBlocked,
        'Any request to a contact for email or phone.',
      ],
    });
  }

  const observationRows =
    (engagement?.byAction.keep_observing ?? 0)
    + (engagement?.byAction.keep_observing_email ?? 0);
  if (observationRows > 0) {
    addTask(tasks, {
      taskId: 'keep_observation_lanes_quiet',
      lane: 'observation',
      priority: 'low',
      owner: 'mantis',
      title: 'Keep observation lanes quiet',
      reason: `${observationRows} engagement row(s) are observation-only; do not convert passive signals into questions or outreach.`,
      status: 'observe_only',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/community-daily-brief',
        command: 'npm run crm:vnext:daily-brief',
        browserRoute: '/crm-vnext/daily-brief',
      },
      allowedNow: [
        'Compare future movement snapshots.',
        'Wait for stronger replies, clicks, purchases, participation, or Instagram signals.',
      ],
      blockedUntilApproval: sharedBlocked,
    });
  }

  return tasks.sort((left, right) => {
    const rank = { high: 3, medium: 2, low: 1 };
    const laneRank = {
      queue_review: 6,
      engagement_context: 5,
      identity_stitching: 4,
      email_capture: 3,
      safety: 2,
      observation: 1,
    };
    return (
      rank[right.priority] - rank[left.priority]
      || Number(right.approvalRequired) - Number(left.approvalRequired)
      || laneRank[right.lane] - laneRank[left.lane]
      || left.taskId.localeCompare(right.taskId)
    );
  });
};

export const buildCrmVNextDailyOperatorHandoffFromInputs = (
  brief: CommunityDailyBrief,
  options: LooseOptions = {},
): CrmVNextDailyOperatorHandoff => {
  const generatedAt = isoNow(options.now);
  const resolutionLoop = options.resolutionLoop ?? null;
  const tasks = buildTasks(brief, resolutionLoop);
  const highPriority = tasks.filter((task) => task.priority === 'high').length;
  const approvalBoundaries = tasks.filter((task) => task.approvalRequired).length;
  const humanAskRecommended = Boolean(
    resolutionLoop?.summary?.questions > 0
    || tasks.some((task) => task.approvalRequired && task.priority === 'high'),
  );
  const urgency =
    highPriority > 0 || brief.queues.totals.notify > 0
      ? 'notify'
      : tasks.some((task) => task.priority === 'medium')
        ? 'watch'
        : 'planning';
  const firstActionableTask =
    tasks.find((task) => task.status === 'ready_internal')
    ?? tasks.find((task) => task.status === 'needs_approval')
    ?? tasks[0];

  const firstMove = firstActionableTask
    ? `${firstActionableTask.owner}: ${firstActionableTask.title}`
    : 'Mantis: keep observing; no daily operator action selected.';

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_DAILY_OPERATOR_HANDOFF_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_daily_operator_handoff',
    source: {
      dailyBriefGeneratedAt: brief.generatedAt,
      cards: brief.summary.totals.cards,
      sourceGeneratedAt: cleanString(options.sourceGeneratedAt),
      engagementRows: brief.engagement?.totals.rows ?? 0,
      engagementLatestCapturedAt: brief.engagement?.source.latestCapturedAt ?? null,
      resolutionLoopIncluded: Boolean(resolutionLoop),
    },
    summary: {
      urgency,
      tasks: tasks.length,
      highPriority,
      approvalBoundaries,
      humanAskRecommended,
      operationsExecuted: 0,
      firstMove,
    },
    tasks,
    doNotDo: [
      'Do not turn passive opens or light observation into outreach.',
      'Do not ask Alejandro broad memory questions when context is already covered.',
      'Do not use a nextAction or score movement as permission to contact anyone.',
      'Do not mutate cards, Fact Store, scores, live sources, or credentials from this handoff.',
    ],
    mantisBrief: [
      `Daily CRM handoff: ${urgency}.`,
      `${brief.summary.totals.cards} cards; email coverage ${pct(brief.summary.totals.emailPresent, brief.summary.totals.cards)}%; Instagram coverage ${pct(brief.summary.totals.instagramPresent, brief.summary.totals.cards)}%.`,
      `Engagement rows: ${brief.engagement?.totals.rows ?? 0}; top action: ${brief.engagement?.topActions[0]?.label ?? 'none'}.`,
      `First move: ${firstMove}.`,
      'Keep everything read-only and no-send unless Alejandro explicitly approves a write or outbound step.',
    ].join(' '),
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      scoreMutationProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
    },
  };
};

export const buildCrmVNextDailyOperatorHandoff = async (
  options: LooseOptions = {},
): Promise<CrmVNextDailyOperatorHandoff> => {
  const generatedAt = isoNow(options.now);
  const [payload, previousSnapshot, engagementMovementQueue, resolutionLoop] = await Promise.all([
    loadPersonCardsVNext({
      preferStore: options.preferStore,
      legacyPath: options.legacyPath,
      cardStorePath: options.cardStorePath,
      now: generatedAt,
    }),
    options.previousSnapshotPath
      ? readCommunityQueueSnapshot(options.previousSnapshotPath)
      : Promise.resolve(null),
    buildCrmVNextEngagementMovementQueue({
      ...options,
      now: generatedAt,
      limit: options.engagementLimit ?? 25,
      snapshotLimit: options.snapshotLimit ?? 5,
      movementLimit: options.movementLimit ?? 100,
      includeUnchanged: options.includeUnchanged,
    }),
    options.includeResolutionLoop === false
      ? Promise.resolve(null)
      : buildCrmVNextEngagementResolutionLoop({
        ...options,
        now: generatedAt,
        limit: options.resolutionLimit ?? 5,
        queueLimit: options.queueLimit ?? 40,
        snapshotLimit: options.snapshotLimit ?? 5,
        movementLimit: options.movementLimit ?? 100,
        includeUnchanged: options.includeUnchanged,
        includeObservationOnly: options.includeObservationOnly,
      }),
  ]);

  const brief = buildCommunityDailyBrief(payload.cards, {
    now: generatedAt,
    previousMatched: snapshotToPreviousMatched(previousSnapshot),
    focusQueueLimit: options.focusQueueLimit ?? 3,
    peoplePerQueue: options.peoplePerQueue ?? 3,
    engagementMovementQueue,
  });

  return buildCrmVNextDailyOperatorHandoffFromInputs(brief, {
    now: generatedAt,
    sourceGeneratedAt: publicPersonCardsVNextSource(payload.source).generatedAt,
    resolutionLoop,
  });
};
