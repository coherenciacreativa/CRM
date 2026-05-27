#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RESPONSE_SCHEMA_VERSION,
  validateResponse,
} from './crm-vnext-mailerlite-mini-launch-department-review-intake.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-reconciliation-2026-05-27';
const DEFAULT_INTAKE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-reconciliation.mjs [options]

Options:
  --intake-board <path>         Department review intake board JSON. Defaults to ${DEFAULT_INTAKE_BOARD}
  --brand-response <path>       Optional Brand response JSON
  --web-design-response <path>  Optional Web Design response JSON
  --crm-response <path>         Optional CRM response JSON
  --out <path>                  Write JSON reconciliation board
  --markdown-out <path>         Write Markdown reconciliation board
  --help                        Show this help

Local-only department review reconciliation. It turns accepted Brand, Web Design
and CRM no-live responses into the next safe non-live moves. It never sends
messages, calls MailerLite/Shopify/CRM APIs, reads subscribers, creates groups,
edits workflows, sends emails, appends ledgers, writes cards, changes scoring,
or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    intakeBoard: DEFAULT_INTAKE_BOARD,
    brandResponse: null,
    webDesignResponse: null,
    crmResponse: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--intake-board') options.intakeBoard = argv[++index];
    else if (arg === '--brand-response') options.brandResponse = argv[++index];
    else if (arg === '--web-design-response') options.webDesignResponse = argv[++index];
    else if (arg === '--crm-response') options.crmResponse = argv[++index];
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
    [options.intakeBoard, 'intake templates, pending departments and launch identity'],
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

const buildResponseState = ({ intakeBoard, responses }) => {
  const templates = intakeBoard.responseTemplates ?? {};
  const validations = Object.fromEntries(['brand', 'web_design', 'crm'].map((department) => [
    department,
    validateResponse({
      department,
      response: responses[department],
      template: templates[department],
    }),
  ]));
  const validationValues = Object.values(validations);

  return {
    validations,
    acceptedDepartments: validationValues.filter((item) => item.accepted).map((item) => item.department),
    pendingDepartments: validationValues.filter((item) => item.status === 'awaiting_response').map((item) => item.department),
    incompleteDepartments: validationValues.filter((item) => item.status === 'incomplete_response').map((item) => item.department),
    blockedDepartments: validationValues.filter((item) => item.status === 'response_has_blockers').map((item) => item.department),
    unsafeDepartments: validationValues.filter((item) => item.unsafe).map((item) => item.department),
    allAccepted: validationValues.every((item) => item.accepted),
  };
};

const groupActionsFromBrand = (brandResponse) => {
  const decisions = brandResponse?.groupDecisions ?? [];
  const acceptedOrRenamed = decisions.filter((item) => ['add_as_candidate', 'rename'].includes(item.decision));
  const rejectedOrCrmFirst = decisions.filter((item) => ['reject', 'crm_first'].includes(item.decision));

  if (!brandResponse) return [];
  if (acceptedOrRenamed.length) {
    return [{
      id: 'rerun_group_dry_run',
      status: 'ready_no_live_after_brand_response',
      owner: 'CRM / MailerLite Planner',
      reason: 'Brand accepted or renamed at least one candidate row.',
      inputs: acceptedOrRenamed.map((item) => ({
        originalName: item.name,
        decision: item.decision,
        effectiveName: item.decision === 'rename' ? item.proposedName : item.name,
      })),
      liveGate: 'closed',
    }];
  }
  if (rejectedOrCrmFirst.length === decisions.length && decisions.length > 0) {
    return [{
      id: 'keep_launch_crm_first_no_mailerlite_groups',
      status: 'ready_no_live_after_brand_response',
      owner: 'CRM',
      reason: 'Brand rejected or marked all candidates CRM-first.',
      inputs: rejectedOrCrmFirst.map((item) => ({
        originalName: item.name,
        decision: item.decision,
      })),
      liveGate: 'closed',
    }];
  }
  return [];
};

const emailActionsFromBrand = (brandResponse) => {
  if (!brandResponse) return [];
  if (brandResponse.sequenceDecision === 'approve') {
    return [{
      id: 'sequence_ready_for_email_style_qa_or_asset_plan',
      status: 'ready_no_live',
      owner: 'Brand / Email',
      reason: 'Brand approved the sequence as review-only.',
      liveGate: 'closed',
    }];
  }
  if (brandResponse.sequenceDecision === 'revise') {
    return [{
      id: 'revise_email_sequence_before_asset_plan',
      status: 'needs_no_live_revision',
      owner: 'Brand / Email',
      reason: 'Brand requested revisions before any asset plan.',
      notes: brandResponse.sequenceNotes ?? [],
      liveGate: 'closed',
    }];
  }
  if (['reject', 'needs_more_context'].includes(brandResponse.sequenceDecision)) {
    return [{
      id: 'hold_email_sequence',
      status: 'blocked_no_live',
      owner: 'Brand / Email',
      reason: `Brand sequence decision is ${brandResponse.sequenceDecision}.`,
      liveGate: 'closed',
    }];
  }
  return [];
};

const webActionsFrom = (webResponse) => {
  if (!webResponse) return [];
  if (webResponse.handoffDecision === 'sufficient_for_local_draft') {
    return [{
      id: 'prepare_scoped_shopify_local_build_request',
      status: 'ready_no_live_request_only',
      owner: 'Web Design / Shopify',
      reason: 'Web Design marked the handoff sufficient for a local draft.',
      proposedLocalBuildFiles: webResponse.proposedLocalBuildFiles ?? [],
      liveGate: 'closed_until_explicit_scope',
    }];
  }
  if (webResponse.handoffDecision === 'needs_revision') {
    return [{
      id: 'revise_shopify_handoff_before_build_request',
      status: 'needs_no_live_revision',
      owner: 'Web Design / Shopify',
      reason: 'Web Design requested handoff revisions.',
      issues: [
        ...(webResponse.mobileUxIssues ?? []),
        ...(webResponse.visualHierarchyIssues ?? []),
        ...(webResponse.ctaFormIssues ?? []),
      ],
      liveGate: 'closed',
    }];
  }
  return [{
    id: 'hold_shopify_path',
    status: 'blocked_no_live',
    owner: 'Web Design / Shopify',
    reason: 'Web Design marked the handoff blocked.',
    liveGate: 'closed',
  }];
};

const crmActionsFrom = (crmResponse) => {
  if (!crmResponse) return [];
  const actions = [];
  if (crmResponse.signalBoundaryDecision === 'approve') {
    actions.push({
      id: 'signal_boundaries_ready_for_future_no_live_projection_packet',
      status: 'ready_no_live',
      owner: 'CRM / Signal OS',
      reason: 'CRM approved signal boundaries as review-only.',
      storeOnlyEvents: crmResponse.storeOnlyEvents ?? [],
      projectableLaterEvents: crmResponse.projectableLaterEvents ?? [],
      liveGate: 'closed',
    });
  } else if (crmResponse.signalBoundaryDecision === 'revise') {
    actions.push({
      id: 'revise_signal_boundaries_before_projection_packet',
      status: 'needs_no_live_revision',
      owner: 'CRM / Signal OS',
      reason: 'CRM requested signal boundary revisions.',
      warnings: crmResponse.receiptInterpretationWarnings ?? [],
      liveGate: 'closed',
    });
  } else {
    actions.push({
      id: 'hold_crm_signal_path',
      status: 'blocked_no_live',
      owner: 'CRM / Signal OS',
      reason: 'CRM marked signal boundaries blocked.',
      liveGate: 'closed',
    });
  }

  if (crmResponse.onboardingProtectionStatus === 'protected') {
    actions.push({
      id: 'onboarding_protection_confirmed',
      status: 'ready_no_live',
      owner: 'CRM / MailerLite',
      reason: 'CRM confirmed onboarding remains a protected separate gate.',
      liveGate: 'closed',
    });
  } else {
    actions.push({
      id: 'hold_onboarding_handoff_design',
      status: 'blocked_no_live',
      owner: 'CRM / MailerLite',
      reason: `Onboarding protection status is ${crmResponse.onboardingProtectionStatus}.`,
      liveGate: 'closed',
    });
  }
  return actions;
};

const buildActionPlan = ({ responseState, responses }) => {
  if (responseState.unsafeDepartments.length) {
    return {
      status: 'blocked_by_unsafe_department_response_no_live_changes',
      actions: [],
      nextNoLiveMoves: [
        'Reject any response that tries to grant live approval.',
        'Ask the department to resubmit with reviewMode=no_live_review and liveApprovalGranted=false.',
      ],
    };
  }

  if (!responseState.allAccepted) {
    return {
      status: 'blocked_until_department_reviews_accepted_no_live_changes',
      actions: [],
      nextNoLiveMoves: [
        'Collect missing no-live department responses through the intake templates.',
        'Fix incomplete or blocked responses before reconciliation.',
        'Keep group dry-runs, Shopify builds, seed tests, Signal Ledger, cards, scoring and onboarding handoff closed.',
      ],
    };
  }

  const actions = [
    ...emailActionsFromBrand(responses.brand),
    ...groupActionsFromBrand(responses.brand),
    ...webActionsFrom(responses.web_design),
    ...crmActionsFrom(responses.crm),
  ];
  const blockedOrRevision = actions.filter((action) => action.status.includes('blocked') || action.status.includes('revision'));

  return {
    status: blockedOrRevision.length
      ? 'department_reviews_reconciled_with_no_live_revisions'
      : 'department_reviews_reconciled_ready_for_next_no_live_moves',
    actions,
    nextNoLiveMoves: blockedOrRevision.length
      ? [
        'Complete the listed no-live revisions before asking for any live-adjacent scope.',
        'If Brand group decisions are accepted or renamed, rerun group dry-run only after copy/semantic blockers are resolved.',
        'Keep all live gates closed.',
      ]
      : [
        'Rerun launch group dry-run if Brand accepted or renamed group candidates.',
        'Prepare a separate scoped Shopify local-build request if Web Design marked the handoff sufficient.',
        'Prepare a no-live CRM signal projection packet only if CRM approved signal boundaries.',
        'Keep every live mutation behind a later exact Alejandro approval.',
      ],
  };
};

const buildSafety = () => ({
  localOnly: true,
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

const buildReconciliationBoard = ({
  intakeBoard,
  responses,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const responseState = buildResponseState({ intakeBoard, responses });
  const actionPlan = buildActionPlan({ responseState, responses });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_reconciliation',
    generatedAt,
    ok: true,
    status: actionPlan.status,
    launch: intakeBoard.launch,
    responseSchemaVersion: RESPONSE_SCHEMA_VERSION,
    responseState,
    actionPlan,
    liveGateSummary: {
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByDepartments: false,
    },
    operatorWarnings: [
      'This board reconciles review responses only; it does not mutate anything.',
      'Accepted department responses can unlock no-live planners, not live operations.',
      'Brand group acceptance can unlock a dry-run, not group creation.',
      'Web local draft readiness can unlock a scoped request, not Shopify edits.',
      'CRM signal readiness can unlock a packet, not ledger/card/scoring/Fact Store writes.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (board) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Reconciliation',
    '',
    `Generated: ${board.generatedAt}`,
    `Status: ${board.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Piloto: ${board.launch?.resourceName ?? 'unknown'} (${board.launch?.launchId ?? 'unknown'})`,
    '',
    'Este tablero reconcilia respuestas de Brand, Web Design y CRM. Si faltan respuestas, mantiene el sistema en espera; si llegan respuestas inseguras, bloquea; si todo esta aceptado, propone solo movimientos no-vivos.',
    '',
    '## Response State',
    '',
    `Accepted: ${board.responseState.acceptedDepartments.join(', ') || 'none'}`,
    `Pending: ${board.responseState.pendingDepartments.join(', ') || 'none'}`,
    `Incomplete: ${board.responseState.incompleteDepartments.join(', ') || 'none'}`,
    `Blocked: ${board.responseState.blockedDepartments.join(', ') || 'none'}`,
    `Unsafe: ${board.responseState.unsafeDepartments.join(', ') || 'none'}`,
    `Live gate open count: ${board.liveGateSummary.openLiveGateCount}`,
    '',
    '## Next No-Live Moves',
    '',
    renderList(board.actionPlan.nextNoLiveMoves),
    '',
    '## Actions',
    '',
  ];

  if (!board.actionPlan.actions.length) {
    lines.push('- No actions yet.');
  } else {
    for (const action of board.actionPlan.actions) {
      lines.push(`- ${action.id}: ${action.status}; owner=${action.owner}; gate=${action.liveGate}; ${action.reason}`);
    }
  }

  lines.push('', '## Operator Warnings', '');
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

const buildBoardFromFiles = async (options) => {
  const [intakeBoard, brandResponse, webDesignResponse, crmResponse, sourceDigests] = await Promise.all([
    readJson(options.intakeBoard),
    readOptionalJson(options.brandResponse),
    readOptionalJson(options.webDesignResponse),
    readOptionalJson(options.crmResponse),
    loadSourceDigests(options),
  ]);

  return buildReconciliationBoard({
    intakeBoard,
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
  if (options.out) await writeJson(options.out, board);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(board));

  console.log(JSON.stringify({
    ok: board.ok,
    status: board.status,
    generatedAt: board.generatedAt,
    launchId: board.launch?.launchId ?? null,
    acceptedDepartments: board.responseState.acceptedDepartments,
    pendingDepartments: board.responseState.pendingDepartments,
    unsafeDepartments: board.responseState.unsafeDepartments,
    openLiveGateCount: board.liveGateSummary.openLiveGateCount,
    actionCount: board.actionPlan.actions.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: board.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch department review reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildActionPlan,
  buildReconciliationBoard,
  buildResponseState,
  buildSafety,
  emailActionsFromBrand,
  groupActionsFromBrand,
  parseArgs,
  renderMarkdown,
  webActionsFrom,
  crmActionsFrom,
};
