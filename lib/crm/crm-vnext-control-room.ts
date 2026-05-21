import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
} from './community-insights-source';
import {
  buildCrmVNextDailyOperatorHandoff,
  type CrmVNextDailyOperatorHandoff,
} from './crm-vnext-daily-operator-handoff';
import {
  buildCrmVNextReadiness,
  type CrmVNextReadiness,
  type CrmVNextReadinessUnavailable,
} from './crm-vnext-readiness';
import {
  buildCrmVNextSignalPacketInboxFromReportsDir,
} from './crm-vnext-signal-packet-inbox.js';
import {
  buildCrmVNextSourceLedger,
  type CrmVNextSourceLedger,
  type CrmVNextSourceLedgerPaths,
} from './crm-vnext-source-ledger';

export const CRM_VNEXT_CONTROL_ROOM_SCHEMA_VERSION =
  'crm-vnext-control-room-2026-05-22' as const;

type LooseOptions = Record<string, any>;

export type CrmVNextControlRoomState =
  | 'blocked'
  | 'process_signal_delta'
  | 'source_unblock_required'
  | 'human_decision_required'
  | 'operator_review'
  | 'observe';

export type CrmVNextControlRoomTile = {
  id: string;
  title: string;
  status: 'ok' | 'watch' | 'blocked';
  value: string | number;
  detail: string;
};

export type CrmVNextControlRoom = {
  ok: true;
  schemaVersion: typeof CRM_VNEXT_CONTROL_ROOM_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_control_room';
  state: CrmVNextControlRoomState;
  summary: {
    firstMove: string;
    cards: number;
    emailCoveragePct: number;
    instagramCoveragePct: number;
    omnichannel: number;
    readinessStatus: CrmVNextReadiness['status'] | CrmVNextReadinessUnavailable['status'];
    sourceLedgerStatus: CrmVNextSourceLedger['status'];
    signalCandidatePackets: number;
    activeSourceBlockers: number;
    operatorTasks: number;
    highPriorityTasks: number;
    humanAskRecommended: boolean;
    operationsExecuted: 0;
  };
  source: {
    personCards: ReturnType<typeof publicPersonCardsVNextSource>;
    dailyHandoffGeneratedAt: string;
    signalInboxGeneratedAt: string;
    sourceLedgerGeneratedAt: string;
  };
  tiles: CrmVNextControlRoomTile[];
  signalRouter: {
    recommendation: string;
    firstMove: unknown;
    candidatePackets: unknown[];
    processedInputPackets: unknown[];
    activeBlockers: unknown[];
    supersededBlockers: unknown[];
  };
  sourceHealth: Array<{
    id: string;
    title: string;
    freshness: string;
    trust: string;
    recordCount: number | null;
    operatorAction: string | null;
  }>;
  operatorPlan: {
    urgency: CrmVNextDailyOperatorHandoff['summary']['urgency'];
    firstMove: string;
    tasks: CrmVNextDailyOperatorHandoff['tasks'];
    doNotDo: string[];
  };
  productDiscipline: {
    bigPicture: string[];
    currentRule: string;
    whatNotToBuildNext: string[];
  };
  safety: {
    localOnly: true;
    readOnly: true;
    outboundProhibited: true;
    liveApiCallsProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    scoreMutationProhibited: true;
    credentialReadProhibited: true;
    externalMutationProhibited: true;
  };
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const pct = (value: number, total: number): number => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const statusFromReadiness = (
  readiness: CrmVNextReadiness | CrmVNextReadinessUnavailable,
): CrmVNextControlRoomTile['status'] => {
  if (readiness.status === 'blocked') return 'blocked';
  if (readiness.status === 'watch') return 'watch';
  return 'ok';
};

const controlState = ({
  readiness,
  signalInbox,
  handoff,
}: {
  readiness: CrmVNextReadiness | CrmVNextReadinessUnavailable;
  signalInbox: any;
  handoff: CrmVNextDailyOperatorHandoff;
}): CrmVNextControlRoomState => {
  if (readiness.status === 'blocked') return 'blocked';
  if ((signalInbox.summary?.candidatePackets ?? 0) > 0) return 'process_signal_delta';
  if ((signalInbox.summary?.activeBlockers ?? 0) > 0) return 'source_unblock_required';
  if (handoff.summary.humanAskRecommended) return 'human_decision_required';
  if (handoff.summary.tasks > 0 && handoff.summary.urgency !== 'planning') return 'operator_review';
  return 'observe';
};

const firstMoveFor = (
  state: CrmVNextControlRoomState,
  signalInbox: any,
  handoff: CrmVNextDailyOperatorHandoff,
): string => {
  if (state === 'blocked') return 'Repair local CRM readiness before running operator loops.';
  if (state === 'process_signal_delta') return String(signalInbox.firstMove?.command ?? 'Run the recommended signal pipeline preview.');
  if (state === 'source_unblock_required') return String(signalInbox.firstMove?.command ?? 'Ask Alejandro for the exact source unblock.');
  if (state === 'human_decision_required') return handoff.summary.firstMove;
  if (state === 'operator_review') return handoff.summary.firstMove;
  return 'Observe. No new signal delta requires engagement loops right now.';
};

const compactSourceHealth = (sourceLedger: CrmVNextSourceLedger) =>
  sourceLedger.sources.map((source) => ({
    id: source.id,
    title: source.title,
    freshness: source.freshness,
    trust: source.trust,
    recordCount: source.recordCount,
    operatorAction: source.operatorAction,
  }));

export const buildCrmVNextControlRoom = async (
  options: LooseOptions = {},
): Promise<CrmVNextControlRoom> => {
  const generatedAt = isoNow(options.now);
  const [personCardsPayload, signalInbox, sourceLedger, handoff] = await Promise.all([
    loadPersonCardsVNext({
      preferStore: options.preferStore,
      legacyPath: options.legacyPath,
      cardStorePath: options.cardStorePath,
      now: generatedAt,
    }),
    buildCrmVNextSignalPacketInboxFromReportsDir({
      reportsDir: options.reportsDir,
      reportsDirLabel: options.reportsDirLabel,
      sinceDays: options.signalSinceDays ?? 14,
      limit: options.signalLimit ?? 120,
      now: generatedAt,
    }),
    buildCrmVNextSourceLedger({
      now: generatedAt,
      expectedMailerLiteContacts: options.expectedMailerLiteContacts ?? null,
      paths: options.sourceLedgerPaths as CrmVNextSourceLedgerPaths | undefined,
    }),
    buildCrmVNextDailyOperatorHandoff({
      ...options,
      now: generatedAt,
      limit: options.engagementLimit ?? 25,
      resolutionLimit: options.resolutionLimit ?? 5,
    }),
  ]);

  const readiness = buildCrmVNextReadiness(personCardsPayload.cards, personCardsPayload.source, { now: generatedAt });
  const cards = readiness.totals.cards;
  const state = controlState({ readiness, signalInbox, handoff });
  const firstMove = firstMoveFor(state, signalInbox, handoff);
  const emailCoveragePct = pct(readiness.totals.emailPresent, cards);
  const instagramCoveragePct = pct(readiness.totals.instagramPresent, cards);

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_CONTROL_ROOM_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_control_room',
    state,
    summary: {
      firstMove,
      cards,
      emailCoveragePct,
      instagramCoveragePct,
      omnichannel: readiness.totals.omnichannel,
      readinessStatus: readiness.status,
      sourceLedgerStatus: sourceLedger.status,
      signalCandidatePackets: signalInbox.summary.candidatePackets,
      activeSourceBlockers: signalInbox.summary.activeBlockers,
      operatorTasks: handoff.summary.tasks,
      highPriorityTasks: handoff.summary.highPriority,
      humanAskRecommended: handoff.summary.humanAskRecommended,
      operationsExecuted: 0,
    },
    source: {
      personCards: publicPersonCardsVNextSource(personCardsPayload.source),
      dailyHandoffGeneratedAt: handoff.generatedAt,
      signalInboxGeneratedAt: signalInbox.generatedAt,
      sourceLedgerGeneratedAt: sourceLedger.generatedAt,
    },
    tiles: [
      {
        id: 'person_cards',
        title: 'Person Cards',
        status: statusFromReadiness(readiness),
        value: cards,
        detail: `${emailCoveragePct}% email coverage; ${instagramCoveragePct}% Instagram coverage.`,
      },
      {
        id: 'signal_delta',
        title: 'Signal Delta',
        status: signalInbox.summary.candidatePackets > 0 ? 'watch' : 'ok',
        value: signalInbox.summary.candidatePackets,
        detail: signalInbox.summary.candidatePackets > 0
          ? 'Unprocessed signal packet(s) ready for pipeline preview.'
          : 'No unprocessed signal packet in the scan window.',
      },
      {
        id: 'source_health',
        title: 'Source Health',
        status: signalInbox.summary.activeBlockers > 0 || sourceLedger.status === 'blocked'
          ? 'blocked'
          : sourceLedger.status === 'watch'
            ? 'watch'
            : 'ok',
        value: signalInbox.summary.activeBlockers,
        detail: `${signalInbox.summary.activeBlockers} active blocker(s); ${signalInbox.summary.supersededBlockers} superseded blocker(s).`,
      },
      {
        id: 'operator_plan',
        title: 'Operator Plan',
        status: handoff.summary.urgency === 'notify' ? 'watch' : 'ok',
        value: handoff.summary.tasks,
        detail: `${handoff.summary.highPriority} high-priority task(s); human ask ${handoff.summary.humanAskRecommended ? 'recommended' : 'not recommended'}.`,
      },
    ],
    signalRouter: {
      recommendation: signalInbox.summary.recommendation,
      firstMove: signalInbox.firstMove,
      candidatePackets: signalInbox.candidatePackets.slice(0, 8),
      processedInputPackets: signalInbox.processedInputPackets.slice(0, 8),
      activeBlockers: signalInbox.blockerPackets.slice(0, 8),
      supersededBlockers: signalInbox.supersededBlockers.slice(0, 8),
    },
    sourceHealth: compactSourceHealth(sourceLedger),
    operatorPlan: {
      urgency: handoff.summary.urgency,
      firstMove: handoff.summary.firstMove,
      tasks: handoff.tasks.slice(0, 8),
      doNotDo: handoff.doNotDo,
    },
    productDiscipline: {
      bigPicture: [
        'Cards remain the current profile truth.',
        'Signals feed interpretation before any action.',
        'Mantis acts as operator, not as an uncontrolled builder.',
        'Outbound and card writes remain separate approval boundaries.',
      ],
      currentRule: 'Run intelligence loops only when the Control Room sees new signal delta, an active blocker, or a concrete human decision.',
      whatNotToBuildNext: [
        'Do not create another broad daily question loop without new packets.',
        'Do not promote legacy surfaces into authority unless they feed the vNext source-of-truth map.',
        'Do not wire outbound actions from warmth movement.',
      ],
    },
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      liveApiCallsProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      scoreMutationProhibited: true,
      credentialReadProhibited: true,
      externalMutationProhibited: true,
    },
  };
};
