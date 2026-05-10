export type CommunityQueueStatusLevel = "ok" | "watch" | "notify";

export type CommunityQueueMonitorStatus = {
  id: string;
  title: string;
  level: CommunityQueueStatusLevel;
  matched: number;
  reason: string;
  alertAction: string | null;
  shouldAlertAlejandro: boolean;
};

export type CommunityQueueMonitorSnapshot = {
  schemaVersion: string;
  generatedAt: string;
  source: {
    schemaVersion: string;
    generatedAt: string;
    cards: number;
  };
  queues: Array<{
    id: string;
    title: string;
    matched: number;
  }>;
};

export type CommunityQueueMonitorInput = {
  ok: boolean;
  status?: {
    generatedAt: string;
    statuses: CommunityQueueMonitorStatus[];
    totals: {
      queues: number;
      notify: number;
      watch: number;
      ok: number;
    };
  };
  snapshot?: {
    current?: CommunityQueueMonitorSnapshot;
    previousLoaded: boolean;
    previousGeneratedAt: string | null;
  };
};

export type CommunityQueueMonitorAlert = {
  title: string;
  message: string;
  generatedAt: string;
  statuses: Array<{
    id: string;
    title: string;
    matched: number;
    level: "notify";
    reason: string;
    alertAction: string;
  }>;
};

export type CommunityQueueMonitorReport = {
  ok: boolean;
  generatedAt: string;
  totals: {
    queues: number;
    notify: number;
    watch: number;
    ok: number;
  };
  snapshot: {
    available: boolean;
    schema: string | null;
    currentGeneratedAt: string | null;
    previousLoaded: boolean;
    previousGeneratedAt: string | null;
  };
  statuses: Array<{
    id: string;
    title: string;
    level: CommunityQueueStatusLevel;
    matched: number;
    reason: string;
    alertAction: string | null;
  }>;
  alert: CommunityQueueMonitorAlert | null;
};

const EMPTY_TOTALS = {
  queues: 0,
  notify: 0,
  watch: 0,
  ok: 0,
};

export function buildCommunityQueueMonitorReport(
  input: CommunityQueueMonitorInput,
): CommunityQueueMonitorReport {
  const status = input.status;
  const statuses = status?.statuses ?? [];
  const generatedAt =
    status?.generatedAt ??
    input.snapshot?.current?.generatedAt ??
    new Date(0).toISOString();
  const alertStatuses = statuses.filter(
    (queueStatus): queueStatus is CommunityQueueMonitorStatus & {
      level: "notify";
      alertAction: string;
    } =>
      queueStatus.level === "notify" &&
      queueStatus.shouldAlertAlejandro &&
      Boolean(queueStatus.alertAction),
  );

  return {
    ok: input.ok,
    generatedAt,
    totals: status?.totals ?? EMPTY_TOTALS,
    snapshot: {
      available: Boolean(input.snapshot?.current),
      schema: input.snapshot?.current?.schemaVersion ?? null,
      currentGeneratedAt: input.snapshot?.current?.generatedAt ?? null,
      previousLoaded: Boolean(input.snapshot?.previousLoaded),
      previousGeneratedAt: input.snapshot?.previousGeneratedAt ?? null,
    },
    statuses: statuses.map((queueStatus) => ({
      id: queueStatus.id,
      title: queueStatus.title,
      level: queueStatus.level,
      matched: queueStatus.matched,
      reason: queueStatus.reason,
      alertAction: queueStatus.alertAction,
    })),
    alert:
      alertStatuses.length > 0
        ? buildMonitorAlert(generatedAt, alertStatuses)
        : null,
  };
}

function buildMonitorAlert(
  generatedAt: string,
  statuses: Array<
    CommunityQueueMonitorStatus & {
      level: "notify";
      alertAction: string;
    }
  >,
): CommunityQueueMonitorAlert {
  const queueList = statuses
    .map((status) => `${status.title}: ${status.matched}`)
    .join("; ");

  return {
    title: "CRM vNext queue alert",
    message: `CRM vNext requires review: ${queueList}.`,
    generatedAt,
    statuses: statuses.map((status) => ({
      id: status.id,
      title: status.title,
      matched: status.matched,
      level: "notify",
      reason: status.reason,
      alertAction: status.alertAction,
    })),
  };
}
