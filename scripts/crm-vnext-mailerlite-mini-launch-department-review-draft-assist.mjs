#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-draft-assist-2026-05-27';
const RESPONSE_SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27';

const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_SEQUENCE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_CANDIDATE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SHOPIFY_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_DRAFTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_codex_drafts_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-draft-assist.mjs [options]

Options:
  --response-workspace <path>   Response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --email-sequence <path>       Email sequence packet JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE}
  --brand-candidate <path>      Brand candidate packet JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE}
  --shopify-handoff <path>      Shopify handoff packet JSON. Defaults to ${DEFAULT_SHOPIFY_HANDOFF}
  --event-contract <path>       Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --readiness-board <path>      Readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --drafts-dir <path>           Draft output directory. Defaults to ${DEFAULT_DRAFTS_DIR}
  --overwrite-drafts            Overwrite existing *.codex_draft.json files
  --out <path>                  Write JSON report
  --markdown-out <path>         Write Markdown report
  --help                        Show this help

Local-only Codex draft assistance for Brand/Web/CRM no-live reviews. It writes
draft suggestions that deliberately use reviewMode=draft_no_live_review so they
cannot be accepted by the intake board as final responses. It does not edit the
final response files and performs no live actions.`;

const DEPARTMENTS = ['brand', 'web_design', 'crm'];

const parseArgs = (argv) => {
  const options = {
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    emailSequence: DEFAULT_EMAIL_SEQUENCE,
    brandCandidate: DEFAULT_BRAND_CANDIDATE,
    shopifyHandoff: DEFAULT_SHOPIFY_HANDOFF,
    eventContract: DEFAULT_EVENT_CONTRACT,
    readinessBoard: DEFAULT_READINESS_BOARD,
    draftsDir: DEFAULT_DRAFTS_DIR,
    overwriteDrafts: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--email-sequence') options.emailSequence = argv[++index];
    else if (arg === '--brand-candidate') options.brandCandidate = argv[++index];
    else if (arg === '--shopify-handoff') options.shopifyHandoff = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--drafts-dir') options.draftsDir = argv[++index];
    else if (arg === '--overwrite-drafts') options.overwriteDrafts = true;
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readJsonIfPresent = async (path) => {
  try {
    return {
      exists: true,
      value: JSON.parse(await readFile(resolve(path), 'utf8')),
      error: null,
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, value: null, error: null };
    return { exists: true, value: null, error: error.message };
  }
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

const sourceDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const candidateNamesFrom = (brandCandidate) => {
  const candidates = brandCandidate?.brandDecisionRequest?.candidates
    ?? brandCandidate?.candidateRows
    ?? [];
  return candidates
    .map((candidate) => candidate?.name ?? candidate)
    .filter(Boolean);
};

const suggestedShopifyFilesFrom = (shopifyHandoff) =>
  (shopifyHandoff?.suggestedShopifyFiles ?? shopifyHandoff?.suggestedFiles ?? [])
    .map((file) => file.path ?? file.file ?? file)
    .filter(Boolean);

const storeOnlyEventsFrom = (eventContract) =>
  (eventContract?.eventContract ?? [])
    .filter((event) => String(event.projectionPosture ?? '').includes('store_only'))
    .map((event) => event.eventKind)
    .filter(Boolean);

const projectableEventsFrom = (eventContract) =>
  (eventContract?.eventContract ?? [])
    .filter((event) => String(event.projectionPosture ?? '').includes('projects'))
    .map((event) => event.eventKind)
    .filter(Boolean);

const finalPathFor = (workspace, department) =>
  workspace?.workingCopies?.find((copy) => copy.department === department)?.finalResponsePath
  ?? `${workspace?.responsesDir ?? DEFAULT_DRAFTS_DIR}/${department}_response.json`;

const draftPathFor = (draftsDir, department) =>
  resolve(draftsDir, `${department}_response.codex_draft.json`);

const attachDraftMeta = ({ response, workspace, department, generatedAt }) => ({
  ...response,
  reviewMode: 'draft_no_live_review',
  liveApprovalGranted: false,
  codexDraftMeta: {
    department,
    generatedAt,
    draftOnly: true,
    acceptedByIntake: false,
    finalResponsePath: finalPathFor(workspace, department),
    conversionRule: 'A real department reviewer must review, edit, then change reviewMode to no_live_review before saving the final response path.',
  },
});

const buildDraftResponses = ({
  workspace,
  emailSequence,
  brandCandidate,
  shopifyHandoff,
  eventContract,
  generatedAt = new Date().toISOString(),
}) => {
  const candidates = candidateNamesFrom(brandCandidate);
  const shopifyFiles = suggestedShopifyFilesFrom(shopifyHandoff);
  const storeOnlyEvents = storeOnlyEventsFrom(eventContract);
  const projectableLaterEvents = projectableEventsFrom(eventContract);
  const launchId = workspace?.launch?.launchId
    ?? emailSequence?.launch?.launchId
    ?? brandCandidate?.launch?.launchId
    ?? shopifyHandoff?.launch?.launchId
    ?? eventContract?.launch?.launchId
    ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar';

  return {
    brand: attachDraftMeta({
      workspace,
      department: 'brand',
      generatedAt,
      response: {
        schemaVersion: RESPONSE_SCHEMA_VERSION,
        department: 'brand',
        launchId,
        reviewMode: 'draft_no_live_review',
        liveApprovalGranted: false,
        sequenceDecision: 'revise',
        sequenceNotes: [
          'Draft sequence is structurally useful and currently reports 0 internal-term hits and 0 "a veces" formula hits.',
          'Before any seed send, Brand should verify that the four emails sound specifically like Alejandro rather than merely clean/on-brand.',
          'Keep follow-up Sent groups off by default unless Brand canonizes one email as a reusable article/carta.',
        ],
        groupDecisions: candidates.map((name) => ({
          name,
          decision: 'add_as_candidate',
          proposedName: null,
          notes: [
            'Draft recommendation only: candidate semantic row, not MailerLite group creation.',
            name.includes('Delivered')
              ? 'Delivered must mean resource/result delivered, not opened, read, clicked or interested.'
              : 'Source must mean launch origin/cohort, not consent, purchase or engagement.',
          ],
        })),
        emailStyleGaps: [
          'Verify signature image or intentional signature substitute.',
          'Verify footer/legal style does not feel like default MailerLite.',
          'Verify CTA color, type and mobile rendering against email_style_canon.',
        ],
        publicInternalLeakIssues: [],
        claimsRiskIssues: [
          'Keep no-diagnostic/no-medical-claim posture visible in public surfaces.',
          'Do not promise improved sleep, anxiety relief or clinical outcome.',
        ],
        blockers: [],
        nextSafeStep: 'Brand edits this draft, then saves final brand_response.json with reviewMode=no_live_review if accepted as no-live response.',
      },
    }),
    web_design: attachDraftMeta({
      workspace,
      department: 'web_design',
      generatedAt,
      response: {
        schemaVersion: RESPONSE_SCHEMA_VERSION,
        department: 'web_design',
        launchId,
        reviewMode: 'draft_no_live_review',
        liveApprovalGranted: false,
        handoffDecision: 'sufficient_for_local_draft',
        mobileUxIssues: [
          'Future local draft must verify landing, quiz, result, thank-you and email capture states on mobile.',
          'Answer choices need stable spacing and tappable controls; avoid cramped quiz-card behavior.',
        ],
        visualHierarchyIssues: [
          'Use Brújula Shopify pages as precedent, not as a rigid clone.',
          'Keep the test quiet, intelligent and warm; avoid loud quiz/funnel styling.',
        ],
        ctaFormIssues: [
          'No real MailerLite form id, group, tag, automation or CRM connection until a separate approval exists.',
          'Hidden launch/source fields must remain internal and absent from public copy.',
        ],
        proposedLocalBuildFiles: shopifyFiles,
        blockers: [],
        nextSafeStep: 'Web Design edits this draft, then saves final web_design_response.json with reviewMode=no_live_review if it accepts a no-live local-draft path.',
      },
    }),
    crm: attachDraftMeta({
      workspace,
      department: 'crm',
      generatedAt,
      response: {
        schemaVersion: RESPONSE_SCHEMA_VERSION,
        department: 'crm',
        launchId,
        reviewMode: 'draft_no_live_review',
        liveApprovalGranted: false,
        signalBoundaryDecision: 'approve',
        storeOnlyEvents,
        projectableLaterEvents,
        receiptInterpretationWarnings: [
          'Source, Delivered and Sent-style receipts are system states, not human interest.',
          'resource_delivered/content_sent must remain separate from open/click/reply/quiz completion.',
          'Experiment identity remains CRM-first by launch_id unless MailerLite needs routing, dedupe or exclusion.',
        ],
        preconditionsBeforeSignalLedgerAppend: [
          'Real observed seed/live events file exists.',
          'Append command is run with explicit write approval and approvedBy=Alejandro.',
          'No card, scoring or Fact Store mutation is bundled with ledger append.',
        ],
        preconditionsBeforeCardWriteOrScoring: [
          'Separate CRM approval packet exists.',
          'Evidence distinguishes delivery from engagement.',
          'Onboarding handoff recommendation is reviewed and not treated as automatic routing.',
        ],
        onboardingProtectionStatus: 'protected',
        blockers: [],
        nextSafeStep: 'CRM edits this draft, then saves final crm_response.json with reviewMode=no_live_review if it accepts the no-live signal boundary.',
      },
    }),
  };
};

const buildSafety = () => ({
  localOnly: true,
  draftFilesOnly: true,
  finalResponsesWritten: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const writeDraft = async ({ path, value, overwrite }) => {
  const existing = await readJsonIfPresent(path);
  if (existing.exists && !overwrite) {
    return {
      path: resolve(path),
      written: false,
      existedBefore: true,
      preservedExisting: true,
      error: existing.error,
    };
  }
  await writeJson(path, value);
  return {
    path: resolve(path),
    written: true,
    existedBefore: existing.exists,
    preservedExisting: false,
    error: null,
  };
};

const buildDraftAssist = async ({
  responseWorkspace,
  emailSequence,
  brandCandidate,
  shopifyHandoff,
  eventContract,
  readinessBoard,
  draftsDir,
  overwriteDrafts = false,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const draftResponses = buildDraftResponses({
    workspace: responseWorkspace,
    emailSequence,
    brandCandidate,
    shopifyHandoff,
    eventContract,
    generatedAt,
  });

  await mkdir(resolve(draftsDir), { recursive: true });
  const draftFiles = [];
  for (const department of DEPARTMENTS) {
    const path = draftPathFor(draftsDir, department);
    const writeState = await writeDraft({
      path,
      value: draftResponses[department],
      overwrite: overwriteDrafts,
    });
    draftFiles.push({
      department,
      draftPath: path,
      finalResponsePath: finalPathFor(responseWorkspace, department),
      reviewMode: draftResponses[department].reviewMode,
      acceptedByIntake: false,
      ...writeState,
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_draft_assist',
    generatedAt,
    ok: true,
    status: 'department_review_codex_drafts_ready_not_final_no_live_changes',
    launch: responseWorkspace?.launch ?? readinessBoard?.launch ?? null,
    draftsDir: resolve(draftsDir),
    draftFiles,
    nextSafeStep: 'Give the draft files to Brand/Web/CRM as starting points; departments must save final response files separately before intake/reconciliation.',
    hardStops: [
      'Do not pass *.codex_draft.json files to intake as final responses.',
      'Do not change reviewMode to no_live_review unless a real department reviewer accepts the response.',
      'Do not treat any draft field as MailerLite, Shopify, CRM, workflow, subscriber, send, ledger, card, scoring or Fact Store approval.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const loadSourceDigests = async (options) => Promise.all([
  sourceDigest(options.responseWorkspace, 'response workspace and final response paths'),
  sourceDigest(options.emailSequence, 'Brand/email sequence draft and QA posture'),
  sourceDigest(options.brandCandidate, 'Brand group candidate semantics'),
  sourceDigest(options.shopifyHandoff, 'Web Design Shopify handoff and suggested files'),
  sourceDigest(options.eventContract, 'CRM event contract and projection boundaries'),
  sourceDigest(options.readinessBoard, 'current mini-launch readiness blockers'),
]);

const buildDraftAssistFromFiles = async (options) => {
  const [
    responseWorkspace,
    emailSequence,
    brandCandidate,
    shopifyHandoff,
    eventContract,
    readinessBoard,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.responseWorkspace),
    readJson(options.emailSequence),
    readJson(options.brandCandidate),
    readJson(options.shopifyHandoff),
    readJson(options.eventContract),
    readJson(options.readinessBoard),
    loadSourceDigests(options),
  ]);

  return buildDraftAssist({
    responseWorkspace,
    emailSequence,
    brandCandidate,
    shopifyHandoff,
    eventContract,
    readinessBoard,
    draftsDir: options.draftsDir,
    overwriteDrafts: options.overwriteDrafts,
    sourceDigests,
  });
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Draft Assist',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Drafts dir: ${report.draftsDir}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Estos son borradores de apoyo hechos por Codex para acelerar las revisiones no-vivas de Brand, Web Design y CRM. No son respuestas finales y no pueden desbloquear intake/reconciliation.',
    '',
    '## Draft Files',
    '',
  ];

  for (const file of report.draftFiles) {
    lines.push(`### ${file.department}`);
    lines.push(`- Draft path: ${file.draftPath}`);
    lines.push(`- Final response path: ${file.finalResponsePath}`);
    lines.push(`- reviewMode: ${file.reviewMode}`);
    lines.push(`- Written now: ${file.written}`);
    lines.push(`- Preserved existing: ${file.preservedExisting}`);
    lines.push(`- Accepted by intake: ${file.acceptedByIntake}`);
    lines.push('');
  }

  lines.push('## Next Safe Step', '');
  lines.push(`- ${report.nextSafeStep}`);

  lines.push('', '## Hard Stops', '');
  lines.push(renderList(report.hardStops));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of report.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo escribe borradores Codex, no respuestas finales.');
  lines.push('- Sin mensajes externos enviados.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return lines.join('\n');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildDraftAssistFromFiles(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    draftsDir: report.draftsDir,
    draftCount: report.draftFiles.length,
    writtenCount: report.draftFiles.filter((file) => file.written).length,
    preservedCount: report.draftFiles.filter((file) => file.preservedExisting).length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department review draft assist failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDraftAssist,
  buildDraftResponses,
  buildSafety,
  draftPathFor,
  parseArgs,
  renderMarkdown,
};
