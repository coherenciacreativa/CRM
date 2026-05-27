#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-intake-2026-05-27';
const RESPONSE_SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27';
const DEFAULT_DISPATCH_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_dispatch_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-intake.mjs [options]

Options:
  --dispatch-packet <path>              Department review dispatch JSON. Defaults to ${DEFAULT_DISPATCH_PACKET}
  --brand-candidate-review-packet <path>
                                        Brand candidate review JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET}
  --brand-response <path>               Optional Brand response JSON
  --web-design-response <path>          Optional Web Design response JSON
  --crm-response <path>                 Optional CRM response JSON
  --templates-dir <path>                Optional directory for response JSON templates
  --out <path>                          Write JSON intake board
  --markdown-out <path>                 Write Markdown intake board
  --help                                Show this help

Local-only department review intake board. It creates response templates and
reconciles Brand, Web Design and CRM review replies without opening live gates.
It never sends messages, calls MailerLite/Shopify/CRM APIs, reads subscribers,
creates groups, edits workflows, sends emails, appends ledgers, writes cards,
changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    dispatchPacket: DEFAULT_DISPATCH_PACKET,
    brandCandidateReviewPacket: DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET,
    brandResponse: null,
    webDesignResponse: null,
    crmResponse: null,
    templatesDir: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--dispatch-packet') options.dispatchPacket = argv[++index];
    else if (arg === '--brand-candidate-review-packet') options.brandCandidateReviewPacket = argv[++index];
    else if (arg === '--brand-response') options.brandResponse = argv[++index];
    else if (arg === '--web-design-response') options.webDesignResponse = argv[++index];
    else if (arg === '--crm-response') options.crmResponse = argv[++index];
    else if (arg === '--templates-dir') options.templatesDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  if (!path) return null;
  return readJson(path);
};

const loadSourceDigests = async (options) => {
  const sources = [
    [options.dispatchPacket, 'review requests, evidence paths and closed actions'],
    [options.brandCandidateReviewPacket, 'exact Brand group candidate names'],
    [options.brandResponse, 'optional Brand response'],
    [options.webDesignResponse, 'optional Web Design response'],
    [options.crmResponse, 'optional CRM response'],
  ].filter(([path]) => Boolean(path));

  const digests = [];
  for (const [path, consultedFor] of sources) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push({
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor,
    });
  }
  return digests;
};

const groupCandidatesFrom = (brandCandidateReviewPacket) => {
  const candidateRows = brandCandidateReviewPacket?.candidateRows ?? [];
  if (candidateRows.length) return candidateRows.map((candidate) => candidate.name ?? candidate).filter(Boolean);
  const requestCandidates = brandCandidateReviewPacket?.brandDecisionRequest?.candidates ?? [];
  return requestCandidates.map((candidate) => candidate.name ?? candidate).filter(Boolean);
};

const launchFrom = (dispatchPacket, brandCandidateReviewPacket) =>
  dispatchPacket?.launch
  ?? brandCandidateReviewPacket?.launch
  ?? {
    launchId: null,
    resourceName: null,
    resourceType: null,
  };

const buildResponseTemplates = ({ dispatchPacket, brandCandidateReviewPacket }) => {
  const launch = launchFrom(dispatchPacket, brandCandidateReviewPacket);
  const groupCandidates = groupCandidatesFrom(brandCandidateReviewPacket);
  return {
    brand: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: 'brand',
      launchId: launch.launchId,
      reviewMode: 'no_live_review',
      liveApprovalGranted: false,
      sequenceDecision: 'pending', // approve | revise | reject | needs_more_context
      sequenceNotes: [],
      groupDecisions: groupCandidates.map((name) => ({
        name,
        decision: 'pending', // add_as_candidate | rename | reject | crm_first
        proposedName: null,
        notes: [],
      })),
      emailStyleGaps: [],
      publicInternalLeakIssues: [],
      claimsRiskIssues: [],
      blockers: [],
      nextSafeStep: null,
    },
    web_design: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: 'web_design',
      launchId: launch.launchId,
      reviewMode: 'no_live_review',
      liveApprovalGranted: false,
      handoffDecision: 'pending', // sufficient_for_local_draft | needs_revision | blocked
      mobileUxIssues: [],
      visualHierarchyIssues: [],
      ctaFormIssues: [],
      proposedLocalBuildFiles: [],
      blockers: [],
      nextSafeStep: null,
    },
    crm: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: 'crm',
      launchId: launch.launchId,
      reviewMode: 'no_live_review',
      liveApprovalGranted: false,
      signalBoundaryDecision: 'pending', // approve | revise | blocked
      storeOnlyEvents: [],
      projectableLaterEvents: [],
      receiptInterpretationWarnings: [],
      preconditionsBeforeSignalLedgerAppend: [],
      preconditionsBeforeCardWriteOrScoring: [],
      onboardingProtectionStatus: 'pending', // protected | needs_revision | blocked
      blockers: [],
      nextSafeStep: null,
    },
  };
};

const normalizeDepartment = (department) => {
  if (department === 'web') return 'web_design';
  return department;
};

const validateResponse = ({ department, response, template }) => {
  const normalizedDepartment = normalizeDepartment(department);
  if (!response) {
    return {
      department: normalizedDepartment,
      status: 'awaiting_response',
      accepted: false,
      unsafe: false,
      missing: ['response_file'],
      nextSafeStep: `Collect ${normalizedDepartment} no-live review response using the template.`,
    };
  }

  const missing = [];
  const unsafe = [];
  if (response.schemaVersion !== RESPONSE_SCHEMA_VERSION) missing.push('schemaVersion');
  if (normalizeDepartment(response.department) !== normalizedDepartment) missing.push('department');
  if (response.launchId !== template.launchId) missing.push('launchId');
  if (response.reviewMode !== 'no_live_review') missing.push('reviewMode');
  if (response.liveApprovalGranted !== false) unsafe.push('liveApprovalGranted_must_be_false');
  if (response.codexDraftMeta) unsafe.push('codexDraftMeta_must_not_be_present_in_final_response');

  if (normalizedDepartment === 'brand') {
    if (!['approve', 'revise', 'reject', 'needs_more_context'].includes(response.sequenceDecision)) missing.push('sequenceDecision');
    const groupDecisions = response.groupDecisions ?? [];
    const expectedNames = new Set((template.groupDecisions ?? []).map((item) => item.name));
    const receivedNames = new Set(groupDecisions.map((item) => item.name));
    for (const expectedName of expectedNames) {
      if (!receivedNames.has(expectedName)) missing.push(`groupDecision:${expectedName}`);
    }
    for (const item of groupDecisions) {
      if (!['add_as_candidate', 'rename', 'reject', 'crm_first'].includes(item.decision)) missing.push(`groupDecisionStatus:${item.name}`);
    }
  }

  if (normalizedDepartment === 'web_design') {
    if (!['sufficient_for_local_draft', 'needs_revision', 'blocked'].includes(response.handoffDecision)) missing.push('handoffDecision');
  }

  if (normalizedDepartment === 'crm') {
    if (!['approve', 'revise', 'blocked'].includes(response.signalBoundaryDecision)) missing.push('signalBoundaryDecision');
    if (!['protected', 'needs_revision', 'blocked'].includes(response.onboardingProtectionStatus)) missing.push('onboardingProtectionStatus');
  }

  const blockers = Array.isArray(response.blockers) ? response.blockers : [];
  const accepted = missing.length === 0 && unsafe.length === 0 && blockers.length === 0;
  return {
    department: normalizedDepartment,
    status: unsafe.length
      ? 'unsafe_response_blocked'
      : missing.length
        ? 'incomplete_response'
        : blockers.length
          ? 'response_has_blockers'
          : 'accepted_no_live_review_response',
    accepted,
    unsafe: unsafe.length > 0,
    missing,
    unsafeReasons: unsafe,
    blockers,
    nextSafeStep: response.nextSafeStep ?? (accepted ? 'Ready for no-live reconciliation.' : 'Revise response before reconciliation.'),
  };
};

const buildReconciliation = ({ templates, responses }) => {
  const validations = Object.fromEntries(Object.entries(templates).map(([department, template]) => [
    department,
    validateResponse({
      department,
      response: responses[department],
      template,
    }),
  ]));

  const values = Object.values(validations);
  const pendingDepartments = values.filter((item) => item.status === 'awaiting_response').map((item) => item.department);
  const incompleteDepartments = values.filter((item) => item.status === 'incomplete_response').map((item) => item.department);
  const blockedDepartments = values.filter((item) => item.status === 'response_has_blockers').map((item) => item.department);
  const unsafeDepartments = values.filter((item) => item.unsafe).map((item) => item.department);
  const acceptedDepartments = values.filter((item) => item.accepted).map((item) => item.department);

  const status = unsafeDepartments.length
    ? 'blocked_by_unsafe_department_response_no_live_changes'
    : pendingDepartments.length || incompleteDepartments.length || blockedDepartments.length
      ? 'awaiting_department_review_responses_no_live_changes'
      : 'department_reviews_ready_for_no_live_reconciliation';

  return {
    status,
    acceptedDepartments,
    pendingDepartments,
    incompleteDepartments,
    blockedDepartments,
    unsafeDepartments,
    validations,
    allResponsesAccepted: acceptedDepartments.length === Object.keys(templates).length,
    liveGateOpenCount: 0,
    liveApprovalNeededNow: false,
  };
};

const buildSafety = () => ({
  localOnly: true,
  templatesOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  signalLedgerAppendPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildIntakeBoard = ({
  dispatchPacket,
  brandCandidateReviewPacket,
  responses,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(dispatchPacket, brandCandidateReviewPacket);
  const templates = buildResponseTemplates({ dispatchPacket, brandCandidateReviewPacket });
  const reconciliation = buildReconciliation({ templates, responses });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_intake',
    generatedAt,
    ok: true,
    status: reconciliation.status,
    launch,
    responseTemplates: templates,
    reconciliation,
    nextNoLiveMoves: reconciliation.allResponsesAccepted
      ? [
        'Generate a no-live reconciliation packet from the accepted department responses.',
        'If Brand accepted or renamed group candidates, rerun the mini-launch group dry-run before any group creation approval exists.',
        'If Web approved local draft readiness, ask for a separate scoped Shopify local-build approval before edits.',
        'If CRM approved signal boundaries, keep Signal Ledger append/card/scoring/Fact Store closed until a separate approval packet exists.',
      ]
      : [
        'Collect missing no-live department responses using the templates.',
        'Reject or revise any response that tries to grant live approval.',
        'Do not rerun group dry-run until Brand response is accepted.',
        'Do not ask for Shopify or MailerLite live-adjacent approval until Brand/Web/CRM reviews are reconciled.',
      ],
    operatorWarnings: [
      'A response template is not approval to act.',
      'A department response cannot grant live approval; liveApprovalGranted must remain false.',
      'Brand group decisions can unblock a future dry-run, not group creation.',
      'Web readiness can unblock a future scoped build request, not Shopify edits or publish.',
      'CRM signal readiness can unblock a future reconciliation, not ledger/card/scoring/Fact Store writes.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderTemplate = (template) => JSON.stringify(template, null, 2);

const renderMarkdown = (board) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Intake Board',
    '',
    `Generated: ${board.generatedAt}`,
    `Status: ${board.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Piloto: ${board.launch.resourceName} (${board.launch.launchId})`,
    '',
    'Este tablero prepara la recepcion de respuestas de Brand, Web Design y CRM. No envia mensajes ni autoriza acciones vivas; solo define plantillas, valida respuestas y mantiene cerrados los gates.',
    '',
    '## Reconciliation',
    '',
    `Accepted departments: ${board.reconciliation.acceptedDepartments.join(', ') || 'none'}`,
    `Pending departments: ${board.reconciliation.pendingDepartments.join(', ') || 'none'}`,
    `Incomplete departments: ${board.reconciliation.incompleteDepartments.join(', ') || 'none'}`,
    `Blocked departments: ${board.reconciliation.blockedDepartments.join(', ') || 'none'}`,
    `Unsafe departments: ${board.reconciliation.unsafeDepartments.join(', ') || 'none'}`,
    `Live gate open count: ${board.reconciliation.liveGateOpenCount}`,
    '',
    '## Next No-Live Moves',
    '',
    renderList(board.nextNoLiveMoves),
    '',
    '## Response Templates',
    '',
  ];

  for (const [department, template] of Object.entries(board.responseTemplates)) {
    lines.push(`### ${department}`);
    lines.push('');
    lines.push('```json');
    lines.push(renderTemplate(template));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Operator Warnings', '');
  lines.push(renderList(board.operatorWarnings));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of board.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin envio de mensajes externos.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin browser.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin emails enviados.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

  return lines.join('\n');
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const writeTemplates = async (templatesDir, templates) => {
  if (!templatesDir) return [];
  const fullDir = resolve(templatesDir);
  await mkdir(fullDir, { recursive: true });
  const written = [];
  for (const [department, template] of Object.entries(templates)) {
    const path = join(fullDir, `${department}_response_template.json`);
    await writeJson(path, template);
    written.push(path);
  }
  return written;
};

const buildBoardFromFiles = async (options) => {
  const [
    dispatchPacket,
    brandCandidateReviewPacket,
    brandResponse,
    webDesignResponse,
    crmResponse,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.dispatchPacket),
    readJson(options.brandCandidateReviewPacket),
    readOptionalJson(options.brandResponse),
    readOptionalJson(options.webDesignResponse),
    readOptionalJson(options.crmResponse),
    loadSourceDigests(options),
  ]);

  return buildIntakeBoard({
    dispatchPacket,
    brandCandidateReviewPacket,
    responses: {
      brand: brandResponse,
      web_design: webDesignResponse,
      crm: crmResponse,
    },
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const board = await buildBoardFromFiles(options);
  const templatesWritten = await writeTemplates(options.templatesDir, board.responseTemplates);
  if (options.out) await writeJson(options.out, board);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(board));

  console.log(JSON.stringify({
    ok: board.ok,
    status: board.status,
    generatedAt: board.generatedAt,
    launchId: board.launch.launchId,
    acceptedDepartments: board.reconciliation.acceptedDepartments,
    pendingDepartments: board.reconciliation.pendingDepartments,
    unsafeDepartments: board.reconciliation.unsafeDepartments,
    liveGateOpenCount: board.reconciliation.liveGateOpenCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    templatesWritten,
    safety: board.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch department review intake failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  RESPONSE_SCHEMA_VERSION,
  buildIntakeBoard,
  buildReconciliation,
  buildResponseTemplates,
  buildSafety,
  groupCandidatesFrom,
  launchFrom,
  parseArgs,
  renderMarkdown,
  validateResponse,
};
