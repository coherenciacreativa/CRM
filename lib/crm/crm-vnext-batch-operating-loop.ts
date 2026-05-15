import { createHash } from 'node:crypto';
import {
  buildCrmVNextCardWriteApply,
  type CrmCardWriteApplyInput,
  type CrmCardWriteApplyPlanItem,
  type CrmCardWriteApplyReport,
} from './crm-vnext-card-write-apply';
import {
  buildCrmVNextCardWriteApprovalPacket,
  type CrmCardWriteApprovalPacketItem,
  type CrmCardWriteApprovalPacketReport,
} from './crm-vnext-card-write-approval-packet';
import {
  buildCrmVNextEvidenceApprovalWorkbench,
  type CrmEvidenceApprovalWorkbenchQueueItem,
  type CrmEvidenceApprovalWorkbenchReport,
} from './crm-vnext-evidence-approval-workbench';

export const CRM_VNEXT_BATCH_OPERATING_LOOP_SCHEMA_VERSION =
  'crm-vnext-batch-operating-loop-2026-05-11' as const;

export type CrmBatchOperatingLoopSearchLane =
  | 'contacts_app_export'
  | 'mailerlite_cursor_scan'
  | 'gmail_search'
  | 'google_drive_retreat_tables'
  | 'lead_capture_traces'
  | 'instagram_manychat_archive'
  | 'official_flow_source_recovery'
  | 'instagram_messages_ui'
  | 'manychat_read_export'
  | 'vercel_proxy_traces'
  | 'local_csv_exports'
  | 'human_identity_clarification';

export type CrmBatchOperatingLoopQueuePriority = 'high' | 'medium' | 'low';
export type CrmBatchOperatingLoopBlockedIdentityStatus =
  | 'blocked_needs_more_identity'
  | 'source_recovery_required';

export type CrmBatchOperatingLoopBlockedIdentityItem = {
  queueItemId: string;
  priority: CrmBatchOperatingLoopQueuePriority;
  approvalItemId: string;
  batchItemId: string;
  status: CrmBatchOperatingLoopBlockedIdentityStatus;
  targetPersonId: string | null;
  subject: CrmCardWriteApprovalPacketItem['subject'];
  recommendedAction: CrmCardWriteApprovalPacketItem['recommendedAction'];
  identitySummary: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
    instagramHandle: string | null;
    missingContactFields: CrmCardWriteApprovalPacketItem['identitySummary']['missingContactFields'];
    fullNameCandidates: string[];
    emailCandidates: string[];
    phoneCandidates: string[];
    confirmedSubjectEmails: string[];
    keptUnassignedEmails: string[];
  };
  proposedServices: CrmCardWriteApprovalPacketItem['proposedServices'];
  relationshipContexts: CrmCardWriteApprovalPacketItem['relationshipContexts'];
  blockers: string[];
  nextEvidenceActions: string[];
  recommendedSearchLanes: CrmBatchOperatingLoopSearchLane[];
  sourceRecoveryRequired: boolean;
  sourceRecoveryReason: string | null;
  humanClarificationAllowedAfterRecovery: boolean;
  operatorPrompt: string;
  safeNextStep: string;
};

export type CrmBatchOperatingLoopReadyApprovalItem = {
  approvalItemId: string;
  targetPersonId: string | null;
  subjectLabel: string;
  recommendedAction: CrmCardWriteApprovalPacketItem['recommendedAction'];
  approvalScopes: CrmCardWriteApprovalPacketItem['approvalScopes'];
  approvalChecklist: string[];
};

export type CrmBatchOperatingLoopReadyWritePreviewItem = {
  applyItemId: string;
  status: CrmCardWriteApplyPlanItem['status'];
  approvalItemId: string;
  targetPersonId: string | null;
  subjectLabel: string;
  recommendedAction: CrmCardWriteApplyPlanItem['recommendedAction'];
  mutationKind: CrmCardWriteApplyPlanItem['mutationKind'];
  proposedCard: {
    personId: string;
    displayName: string | null;
    identities: CrmCardWriteApplyPlanItem['proposedCard'] extends infer T
      ? T extends null
        ? never
        : T extends { identities: infer I }
          ? I
          : never
      : never;
    products: CrmCardWriteApplyPlanItem['proposedCard'] extends infer T
      ? T extends null
        ? never
        : T extends { products: infer P }
          ? P
          : never
      : never;
    evidenceCount: number;
  } | null;
  operations: Array<{
    operationId: string;
    type: string;
    executed: false;
    approvalRequired: string[];
  }>;
  approvalScopes: string[];
  commitBlockers: string[];
};

export type CrmBatchOperatingLoopNoMaterialDeltaItem = {
  applyItemId: string;
  approvalItemId: string;
  targetPersonId: string | null;
  subjectLabel: string;
  recommendedAction: CrmCardWriteApplyPlanItem['recommendedAction'];
  safeNextStep: string;
};

export type CrmBatchOperatingLoopReport = {
  schemaVersion: typeof CRM_VNEXT_BATCH_OPERATING_LOOP_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_batch_operating_loop';
  summary: {
    items: number;
    evidenceQuestionQueueItems: number;
    readyForCardWriteApproval: number;
    blockedIdentityItems: number;
    noMaterialDeltaItems: number;
    readyWritePlanItems: number;
    operationsPreviewed: number;
    operationsPlannedForDryRun: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  operatorRunbook: {
    purpose: string;
    sequence: string[];
    stopConditions: string[];
  };
  evidenceQuestionQueue: CrmEvidenceApprovalWorkbenchQueueItem[];
  readyApprovalItems: CrmBatchOperatingLoopReadyApprovalItem[];
  blockedIdentityQueue: CrmBatchOperatingLoopBlockedIdentityItem[];
  noMaterialDeltaQueue: CrmBatchOperatingLoopNoMaterialDeltaItem[];
  readyWritePreview: {
    mode: CrmCardWriteApplyReport['mode'];
    summary: CrmCardWriteApplyReport['summary'];
    planItems: CrmBatchOperatingLoopReadyWritePreviewItem[];
  };
  componentSummaries: {
    evidenceApprovalWorkbench: CrmEvidenceApprovalWorkbenchReport['summary'];
    cardWriteApprovalPacket: CrmCardWriteApprovalPacketReport['summary'];
    cardWriteDryRun: CrmCardWriteApplyReport['summary'];
  };
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    manyChatLiveMutationProhibited: true;
    instagramPermissionMutationProhibited: true;
    mailerLiteCredentialMutationProhibited: true;
    batchLoopOnly: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmBatchOperatingLoopInput = CrmCardWriteApplyInput & {
  workbench?: CrmEvidenceApprovalWorkbenchReport | null;
  approvalPacket?: CrmCardWriteApprovalPacketReport | null;
  applyDryRun?: CrmCardWriteApplyReport | null;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicText(value);
  return cleaned || null;
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const priorityRank = { high: 0, medium: 1, low: 2 } as const;

const hasMissingContactField = (
  item: CrmCardWriteApprovalPacketItem,
  field: 'email' | 'phone' | 'instagramHandle',
): boolean => new Set(item.identitySummary.missingContactFields).has(field);

const hasInstagramAnchor = (item: CrmCardWriteApprovalPacketItem): boolean =>
  Boolean(item.subject.instagramHandle || item.identitySummary.instagramHandle);

const searchableItemText = (item: CrmCardWriteApprovalPacketItem): string =>
  [
    item.targetPersonId,
    item.subject.label,
    item.subject.rawName,
    item.subject.proposedDisplayName,
    item.subject.instagramHandle,
    item.identitySummary.displayName,
    item.identitySummary.instagramHandle,
    item.identitySummary.fullNameCandidates.join(' '),
    item.identitySummary.emailCandidates.join(' '),
    item.identitySummary.phoneCandidates.join(' '),
    item.blockers.join(' '),
    item.nextEvidenceActions.join(' '),
    JSON.stringify(item.proposedServices),
    JSON.stringify(item.relationshipContexts),
  ].filter(Boolean).join(' ');

const hasOfficialFlowSignal = (item: CrmCardWriteApprovalPacketItem): boolean => {
  if (hasInstagramAnchor(item)) return true;
  return /\b(instagram|ig[:\s@]|manychat|lead[-_ ]?capture|lead capture|onboarding|vercel|proxy|webhook|custom gpt|flujo oficial|bienvenida|saludo|mailer\s?lite)\b/i
    .test(searchableItemText(item));
};

const officialFlowSourceRecoveryRequired = (
  item: CrmCardWriteApprovalPacketItem,
): boolean =>
  (hasMissingContactField(item, 'email') || hasMissingContactField(item, 'phone'))
  && hasOfficialFlowSignal(item);

const priorityForBlockedItem = (
  item: CrmCardWriteApprovalPacketItem,
): CrmBatchOperatingLoopQueuePriority => {
  const missing = new Set(item.identitySummary.missingContactFields);
  if (officialFlowSourceRecoveryRequired(item)) return 'high';
  if (
    item.proposedServices.length > 0
    && (missing.has('email') || missing.has('phone'))
  ) {
    return 'high';
  }
  if (item.subject.instagramHandle || item.identitySummary.instagramHandle) return 'medium';
  return 'low';
};

const searchLanesForBlockedItem = (
  item: CrmCardWriteApprovalPacketItem,
): CrmBatchOperatingLoopSearchLane[] => {
  const missing = new Set(item.identitySummary.missingContactFields);
  const lanes: CrmBatchOperatingLoopSearchLane[] = [];
  const needsSourceRecovery = officialFlowSourceRecoveryRequired(item);

  if (needsSourceRecovery) {
    lanes.push(
      'official_flow_source_recovery',
      'instagram_messages_ui',
      'lead_capture_traces',
      'instagram_manychat_archive',
      'manychat_read_export',
      'vercel_proxy_traces',
      'mailerlite_cursor_scan',
      'gmail_search',
    );
  }

  if (missing.has('email')) {
    lanes.push(
      'mailerlite_cursor_scan',
      'gmail_search',
      'google_drive_retreat_tables',
      'lead_capture_traces',
      'local_csv_exports',
    );
  }
  if (missing.has('phone')) {
    lanes.push(
      'contacts_app_export',
      'mailerlite_cursor_scan',
      'gmail_search',
      'google_drive_retreat_tables',
      'lead_capture_traces',
      'local_csv_exports',
    );
  }
  if (missing.has('instagramHandle')) {
    lanes.push(
      'lead_capture_traces',
      'instagram_manychat_archive',
      'contacts_app_export',
    );
  }
  if (!lanes.length) {
    lanes.push(
      'contacts_app_export',
      'mailerlite_cursor_scan',
      'gmail_search',
      'google_drive_retreat_tables',
      'human_identity_clarification',
    );
  }

  if (hasInstagramAnchor(item)) {
    lanes.push('lead_capture_traces', 'instagram_manychat_archive');
  }

  return unique(lanes);
};

const promptForBlockedItem = (
  item: CrmCardWriteApprovalPacketItem,
  lanes: CrmBatchOperatingLoopSearchLane[],
): string => {
  const needsSourceRecovery = officialFlowSourceRecoveryRequired(item);
  const subject = cleanString(item.subject.label)
    ?? cleanString(item.identitySummary.displayName)
    ?? cleanString(item.targetPersonId)
    ?? 'este contacto';
  const handle = cleanString(item.subject.instagramHandle ?? item.identitySummary.instagramHandle);
  const target = cleanString(item.targetPersonId);
  const missing = item.identitySummary.missingContactFields.length
    ? item.identitySummary.missingContactFields.join(', ')
    : 'stable identity evidence';
  const anchors = [
    handle ? `IG @${handle}` : null,
    target ? `target ${target}` : null,
    item.identitySummary.email ? `email ${item.identitySummary.email}` : null,
    item.identitySummary.phone ? `phone ${item.identitySummary.phone}` : null,
  ].filter(Boolean).join('; ');

  return cleanPublicText([
    `Mantis: busca en modo read-only evidencia adicional para ${subject}.`,
    anchors ? `Anclas conocidas: ${anchors}.` : null,
    `Falta confirmar: ${missing}.`,
    `Carriles sugeridos: ${lanes.join(', ')}.`,
    needsSourceRecovery
      ? 'Regla official-flow source recovery: no preguntes a Alejandro todavía por email/teléfono; primero agota las fuentes del flujo oficial Instagram/onboarding.'
      : null,
    needsSourceRecovery
      ? 'Busca IG Messages UI, ManyChat/export local, Vercel/proxy/webhook traces, MailerLite cursor scan, lead-capture ledgers, reportes locales y Gmail/Drive si ayudan.'
      : null,
    needsSourceRecovery
      ? 'En IG Messages captura también ciudad, país, preferencias, origen, tono y contexto útil cuando aparezcan como texto explícito; conserva solo snippets mínimos.'
      : null,
    needsSourceRecovery
      ? 'Si login, Relay, permiso, checkpoint o auth bloquea una fuente, guarda awaiting_human_unblock con anchors pendientes y pide desbloqueo; no cierres el batch como completo.'
      : null,
    needsSourceRecovery
      ? 'El JSON debe incluir searchedSources, discardedCandidates, remainingGaps y why_previous_batch_missed_this por contacto.'
      : null,
    'Devuelve evidenceSources JSON compatibles con CRM vNext, con sourceKind/sourceId/text o snippet.',
    'No mutar CRM, ManyChat LIVE, MailerLite, Gmail, Drive, Contacts, Instagram, WhatsApp, Telegram ni credenciales. No enviar mensajes.',
  ].filter(Boolean).join(' '));
};

const blockedIdentityQueueItemFor = (
  item: CrmCardWriteApprovalPacketItem,
): CrmBatchOperatingLoopBlockedIdentityItem => {
  const lanes = searchLanesForBlockedItem(item);
  const priority = priorityForBlockedItem(item);
  const needsSourceRecovery = officialFlowSourceRecoveryRequired(item);

  return {
    queueItemId: `blocked_identity_queue_${hashId([item.approvalItemId, item.targetPersonId, item.subject.label])}`,
    priority,
    approvalItemId: item.approvalItemId,
    batchItemId: item.batchItemId,
    status: needsSourceRecovery ? 'source_recovery_required' : 'blocked_needs_more_identity',
    targetPersonId: item.targetPersonId,
    subject: item.subject,
    recommendedAction: item.recommendedAction,
    identitySummary: {
      displayName: cleanString(item.identitySummary.displayName),
      email: cleanString(item.identitySummary.email),
      phone: cleanString(item.identitySummary.phone),
      instagramHandle: cleanString(item.identitySummary.instagramHandle),
      missingContactFields: item.identitySummary.missingContactFields,
      fullNameCandidates: item.identitySummary.fullNameCandidates.map((value) => cleanString(value)).filter((value): value is string => Boolean(value)),
      emailCandidates: item.identitySummary.emailCandidates.map((value) => cleanString(value)).filter((value): value is string => Boolean(value)),
      phoneCandidates: item.identitySummary.phoneCandidates.map((value) => cleanString(value)).filter((value): value is string => Boolean(value)),
      confirmedSubjectEmails: item.identitySummary.evidenceDecisionSummary.confirmedSubjectEmails,
      keptUnassignedEmails: item.identitySummary.evidenceDecisionSummary.keptUnassignedEmails,
    },
    proposedServices: item.proposedServices,
    relationshipContexts: item.relationshipContexts,
    blockers: unique([
      ...item.blockers,
      ...item.identitySummary.missingContactFields.map((field) => `missing_${field}`),
    ]),
    nextEvidenceActions: item.nextEvidenceActions,
    recommendedSearchLanes: lanes,
    sourceRecoveryRequired: needsSourceRecovery,
    sourceRecoveryReason: needsSourceRecovery
      ? 'Missing email/phone on an Instagram/onboarding-like contact should be recovered from official-flow sources before asking Alejandro.'
      : null,
    humanClarificationAllowedAfterRecovery: true,
    operatorPrompt: promptForBlockedItem(item, lanes),
    safeNextStep: needsSourceRecovery
      ? 'Run official-flow source recovery read-only, rerun the batch operating loop, and ask Alejandro only after those lanes are exhausted or blocked.'
      : 'Gather read-only evidence, rerun the batch operating loop, and ask Alejandro only for unresolved identity decisions.',
  };
};

const compactReadyApprovalItem = (
  item: CrmCardWriteApprovalPacketItem,
): CrmBatchOperatingLoopReadyApprovalItem => ({
  approvalItemId: item.approvalItemId,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subject.label,
  recommendedAction: item.recommendedAction,
  approvalScopes: item.approvalScopes,
  approvalChecklist: item.approvalChecklist,
});

const compactReadyWritePlanItem = (
  item: CrmCardWriteApplyPlanItem,
): CrmBatchOperatingLoopReadyWritePreviewItem => ({
  applyItemId: item.applyItemId,
  status: item.status,
  approvalItemId: item.approvalItemId,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subject.label,
  recommendedAction: item.recommendedAction,
  mutationKind: item.mutationKind,
  proposedCard: item.proposedCard ? {
    personId: item.proposedCard.personId,
    displayName: cleanString(item.proposedCard.displayName),
    identities: item.proposedCard.identities,
    products: item.proposedCard.products,
    evidenceCount: item.proposedCard.evidence.length,
  } : null,
  operations: item.operations.map((operation) => ({
    operationId: operation.operationId,
    type: operation.type,
    executed: false,
    approvalRequired: operation.approvalRequired,
  })),
  approvalScopes: item.approvalScopes,
  commitBlockers: item.commitBlockers,
});

const compactNoMaterialDeltaItem = (
  item: CrmCardWriteApplyPlanItem,
): CrmBatchOperatingLoopNoMaterialDeltaItem => ({
  applyItemId: item.applyItemId,
  approvalItemId: item.approvalItemId,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subject.label,
  recommendedAction: item.recommendedAction,
  safeNextStep: 'No card write is useful yet. Ask Alejandro for human context, run a more specific evidence hunt, or produce context-fact proposals before reattempting approval.',
});

const safety = (): CrmBatchOperatingLoopReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  manyChatLiveMutationProhibited: true,
  instagramPermissionMutationProhibited: true,
  mailerLiteCredentialMutationProhibited: true,
  batchLoopOnly: true,
  allowedUse: [
    'Give Mantis one standard operating loop for a batch of CRM clues.',
    'Separate evidence questions, identity blockers, and ready card-write approvals.',
    'Preview the local write plan without executing any mutation.',
  ],
  prohibitedActions: [
    'Do not write person cards from this loop.',
    'Do not write Fact Store from this loop.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts APIs.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not treat a ready item as permission to contact someone.',
  ],
});

export const buildCrmVNextBatchOperatingLoop = (
  input: CrmBatchOperatingLoopInput,
): CrmBatchOperatingLoopReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const workbench = input.workbench ?? buildCrmVNextEvidenceApprovalWorkbench({
    ...input,
    now: generatedAt,
  });
  const approvalPacket = input.approvalPacket ?? buildCrmVNextCardWriteApprovalPacket({
    ...input,
    now: generatedAt,
  });
  const {
    workbench: _workbench,
    approvalPacket: _approvalPacket,
    applyDryRun: _applyDryRun,
    packet: _packet,
    ...applyInput
  } = input as CrmBatchOperatingLoopInput & { packet?: unknown };
  const applyDryRun = input.applyDryRun ?? buildCrmVNextCardWriteApply({
    ...applyInput,
    now: generatedAt,
    applyAllReady: true,
    commit: false,
  } as CrmCardWriteApplyInput);
  const readyWriteApprovalItemIds = new Set(
    applyDryRun.planItems
      .filter((item) => item.status === 'ready_to_commit')
      .map((item) => item.approvalItemId),
  );
  const readyApprovalItems = approvalPacket.approvalItems
    .filter((item) => item.status === 'ready_for_human_approval')
    .filter((item) => readyWriteApprovalItemIds.has(item.approvalItemId))
    .map(compactReadyApprovalItem);
  const blockedIdentityQueue = approvalPacket.approvalItems
    .filter((item) => item.status === 'blocked_needs_more_identity')
    .map(blockedIdentityQueueItemFor)
    .sort((left, right) =>
      priorityRank[left.priority] - priorityRank[right.priority]
      || left.subject.label.localeCompare(right.subject.label));
  const readyWritePlanItems = applyDryRun.planItems
    .filter((item) => item.status === 'ready_to_commit')
    .map(compactReadyWritePlanItem);
  const noMaterialDeltaQueue = applyDryRun.planItems
    .filter((item) => item.status === 'blocked_no_material_card_delta')
    .map(compactNoMaterialDeltaItem);

  return {
    schemaVersion: CRM_VNEXT_BATCH_OPERATING_LOOP_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_batch_operating_loop',
    summary: {
      items: approvalPacket.summary.items,
      evidenceQuestionQueueItems: workbench.summary.queueItems,
      readyForCardWriteApproval: readyApprovalItems.length,
      blockedIdentityItems: blockedIdentityQueue.length,
      noMaterialDeltaItems: noMaterialDeltaQueue.length,
      readyWritePlanItems: readyWritePlanItems.length,
      operationsPreviewed: approvalPacket.summary.operationsPreviewed,
      operationsPlannedForDryRun: applyDryRun.summary.operationsPlanned,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    operatorRunbook: {
      purpose: 'Turn a fresh CRM evidence batch into the next safe operator action without leaving read-only mode.',
      sequence: [
        'Resolve evidenceQuestionQueue first when it has items; store decisions only after Alejandro confirms.',
        'When blockedIdentityQueue.status is source_recovery_required, exhaust official-flow sources before asking Alejandro for missing email or phone.',
        'Send each blockedIdentityQueue.operatorPrompt to Mantis or run the named helper lanes in read-only mode.',
        'When readyApprovalItems exist, ask Alejandro for explicit card-write approval before any commit.',
        'Use readyWritePreview only as a dry-run plan; it never authorizes mutation by itself.',
      ],
      stopConditions: [
        'Stop before any outbound message, tag change, automation change, or live channel action.',
        'Stop before credential refresh, token rotation, or permission changes.',
        'Stop before committed card writes unless Alejandro approved exact item(s), approver, and local write scope.',
      ],
    },
    evidenceQuestionQueue: workbench.queueItems,
    readyApprovalItems,
    blockedIdentityQueue,
    noMaterialDeltaQueue,
    readyWritePreview: {
      mode: applyDryRun.mode,
      summary: applyDryRun.summary,
      planItems: readyWritePlanItems,
    },
    componentSummaries: {
      evidenceApprovalWorkbench: workbench.summary,
      cardWriteApprovalPacket: approvalPacket.summary,
      cardWriteDryRun: applyDryRun.summary,
    },
    safety: safety(),
  };
};
