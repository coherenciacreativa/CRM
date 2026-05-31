#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle-2026-05-28';

const DEFAULT_MISSING_INPUTS_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json';
const DEFAULT_BLOCKED_GATE_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle.mjs [options]

Options:
  --missing-inputs-kit <path>      Missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --missing-inputs-intake <path>   Missing-inputs intake JSON. Defaults to ${DEFAULT_MISSING_INPUTS_INTAKE}
  --blocked-gate-handoff <path>    Blocked-gate handoff JSON. Defaults to ${DEFAULT_BLOCKED_GATE_HANDOFF}
  --out <path>                     Write JSON request bundle. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown request bundle. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Local-only request bundle for MailerLite Launch OS missing inputs. It turns the
current missing-input specs into copy-ready request blocks. It does not
create private files, ask for approval, open UI, call APIs, read subscribers,
mutate groups/workflows/cards/scoring/Fact Store, send emails or print private
values.`;

const parseArgs = (argv) => {
  const options = {
    missingInputsKit: DEFAULT_MISSING_INPUTS_KIT,
    missingInputsIntake: DEFAULT_MISSING_INPUTS_INTAKE,
    blockedGateHandoff: DEFAULT_BLOCKED_GATE_HANDOFF,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--missing-inputs-kit') options.missingInputsKit = argv[++index];
    else if (arg === '--missing-inputs-intake') options.missingInputsIntake = argv[++index];
    else if (arg === '--blocked-gate-handoff') options.blockedGateHandoff = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const publicDigest = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  createsPrivateFiles: false,
  asksApproval: false,
  uiOpened: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  exactPrivateValuesPrinted: false,
  tokensPrinted: false,
});

const requestMetadata = {
  exact_seed_recipient: {
    title: 'Exact seed recipient',
    audience: 'Alejandro',
    targetField: 'private seed email file',
    copyReadyText: (request) =>
      `Necesito exactamente un email semilla para guardarlo como input privado en ${request.templatePathSuggestion}. Esto solo desbloquea la regeneracion local del packet de seed-send; no aprueba test send, envio publico, subscribers, grupos, workflows, Shopify, CRM, ledgers, cards, scoring ni Fact Store.`,
    collectionRule: 'Provide one exact email address only, in the private local file. Do not paste it into shared/public reports.',
  },
  real_observed_events_file: {
    title: 'Real observed events file',
    audience: 'Alejandro or CRM operator',
    targetField: 'private observed-events JSON',
    copyReadyText: (request) =>
      `Necesito el JSON privado de eventos reales observados para este mini-lanzamiento en ${request.templatePathSuggestion}. Debe contener eventos reales con eventKind, sourceKind, channel, sourceId, observedAt, launchId en metrics.launchId y evidenceSourcePath. No uses datos inventados ni ejemplos.`,
    collectionRule: 'Supply real observed event evidence in the private JSON path; sample events cannot become CRM evidence.',
  },
  exact_people: {
    title: 'Exact people or CRM identities',
    audience: 'Alejandro or CRM operator',
    targetField: 'identity fields inside observed-events JSON',
    copyReadyText: (request) =>
      `Cada evento real del JSON privado en ${request.templatePathSuggestion} debe traer una identidad exacta: email, instagramHandle o personId. Esta identidad se valida/redacta localmente; no se imprime completa en reportes compartidos y no autoriza escrituras CRM.`,
    collectionRule: 'Add exact identity fields inside each real event; do not store full identities in public reports.',
  },
  writable_event_screen: {
    title: 'Writable-event screen',
    audience: 'Codex/Mantis local operator',
    targetField: 'local CRM write packet evidence',
    copyReadyText: (request) =>
      `Cuando el JSON privado exista en ${request.templatePathSuggestion}, rerunear el intake y el packet CRM local para confirmar que los eventos son writable: launchId correcto, campos completos, identidad exacta y cero muestras. Esto no ejecuta escrituras CRM.`,
    collectionRule: 'Use local packet regeneration only; writable means eligible for a later approval packet, not authorized to write.',
  },
  fact_store_market_review: {
    title: 'Fact Store market review',
    audience: 'Alejandro or CRM operator',
    targetField: 'reviewed aggregate facts inside private observed-events JSON',
    copyReadyText: (request) =>
      `Si la familia de escritura futura incluye Fact Store, necesito una revision humana de hechos agregados en ${request.templatePathSuggestion}: hechos exactos, evidenceEventIds y estado reviewed. Esto no escribe Fact Store y no reemplaza una aprobacion posterior.`,
    collectionRule: 'Required only for a future Fact Store write family; keep exact facts in private/internal evidence.',
  },
  final_public_links: {
    title: 'Final approved public links',
    audience: 'Alejandro or launch operator',
    targetField: 'private correction inputs JSON',
    copyReadyText: (request) =>
      `Necesito los 3 links publicos finales aprobados en ${request.templatePathSuggestion}: result_or_resource_link, practice_link y editorial_note_link. Esto solo habilita preview/correccion local redacted; no aprueba editar MailerLite UI, reenviar tests, publicar, programar, enviar a audiencia, tocar subscribers, grupos, workflows, Shopify, CRM, ledgers, cards, scoring ni Fact Store.`,
    collectionRule: 'Supply final links in the private correction inputs JSON; shared reports may store hashes only, never full URLs.',
  },
  subscription_reason_policy: {
    title: 'Footer/subscription-reason policy',
    audience: 'Alejandro or launch operator',
    targetField: 'private correction inputs JSON',
    copyReadyText: (request) =>
      `Necesito escoger una politica para la linea de razon de suscripcion en ${request.templatePathSuggestion}: include_once_in_all_emails o remove_custom_line_and_rely_on_platform_footer. Esto no aprueba editar MailerLite UI, reenviar tests, publicar, programar, enviar a audiencia ni tocar ningun sistema vivo.`,
    collectionRule: 'Choose exactly one allowed policy value; this is an input decision, not approval for execution.',
  },
};

const byId = (items = []) => new Map(items.filter((item) => item?.id).map((item) => [item.id, item]));
const unique = (items) => [...new Set((items ?? []).filter(Boolean))];

const buildRequestBlock = ({ request, state, handoffInput }) => {
  const meta = requestMetadata[request.id] ?? {
    title: request.label ?? request.id,
    audience: 'Alejandro or operator',
    targetField: request.captureMode ?? 'local input',
    copyReadyText: () => `Suministrar el input ${request.id} sin tratarlo como aprobacion ni ejecucion.`,
    collectionRule: 'Collect locally without live actions.',
  };

  const normalizedRequest = {
    id: request.id,
    gateId: request.gateId ?? state?.gateId ?? handoffInput?.gateId ?? null,
    label: request.label ?? handoffInput?.label ?? meta.title,
    requiredFor: request.requiredFor ?? handoffInput?.requiredFor ?? null,
    acceptableForm: request.acceptableForm ?? handoffInput?.acceptableForm ?? null,
    privacy: request.privacy ?? 'private_or_internal_evidence',
    captureMode: request.captureMode ?? null,
    templatePathSuggestion: request.templatePathSuggestion ?? null,
    approvalEffect: request.approvalEffect ?? state?.approvalEffect ?? 'does_not_approve_execution',
    statusNow: state?.status ?? 'unknown_no_live_changes',
    blockers: state?.blockers ?? [],
  };

  return {
    ...normalizedRequest,
    title: meta.title,
    audience: meta.audience,
    targetField: meta.targetField,
    copyReadyText: meta.copyReadyText(normalizedRequest),
    collectionRule: meta.collectionRule,
    createsPrivateFile: false,
    asksApproval: false,
    canExecuteAfterCollection: false,
    nextLocalCommandAfterInput: request.nextLocalCommandAfterInput ?? null,
  };
};

const buildRequestBlocks = ({ missingInputsKit, missingInputsIntake, blockedGateHandoff }) => {
  const statesById = byId(missingInputsIntake?.inputStates);
  const handoffInputsById = byId(blockedGateHandoff?.inputNeededNow);
  const requestedIds = unique([
    ...(missingInputsKit?.inputRequests ?? []).map((request) => request?.id),
    ...(missingInputsIntake?.inputStates ?? []).map((state) => state?.id),
    ...(blockedGateHandoff?.inputNeededNow ?? []).map((input) => input?.id),
  ]);
  const kitRequestsById = byId(missingInputsKit?.inputRequests);

  return requestedIds.map((id) => buildRequestBlock({
    request: kitRequestsById.get(id) ?? { id },
    state: statesById.get(id),
    handoffInput: handoffInputsById.get(id),
  }));
};

const buildPostInputCommands = ({ missingInputsKit, missingInputsIntake }) => unique([
  ...(missingInputsKit?.postInputCommands ?? []),
  missingInputsIntake?.executiveSummary?.readyForSeedApprovalPacket === true
    ? missingInputsIntake?.postInputCommands?.seedApprovalPacket
    : null,
  missingInputsIntake?.executiveSummary?.readyForCrmWritePacketRegeneration === true
    ? missingInputsIntake?.postInputCommands?.crmWriteApprovalPacket
    : null,
]).filter(Boolean);

const buildMissingInputsRequestBundle = ({
  missingInputsKit,
  missingInputsIntake,
  blockedGateHandoff,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const requests = buildRequestBlocks({ missingInputsKit, missingInputsIntake, blockedGateHandoff });
  const requestIds = requests.map((request) => request.id);
  const safety = buildSafety();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_missing_inputs_request_bundle',
    generatedAt,
    ok: true,
    status: 'missing_inputs_request_bundle_ready_no_live_changes',
    executiveSummary: {
      missingInputsKitStatus: missingInputsKit?.status ?? null,
      missingInputsIntakeStatus: missingInputsIntake?.status ?? null,
      blockedGateHandoffStatus: blockedGateHandoff?.status ?? null,
      requestCount: requests.length,
      requestIds,
      copyBlocksReady: requests.length > 0 && requests.every((request) => Boolean(cleanString(request.copyReadyText))),
      readyInputCount: missingInputsIntake?.executiveSummary?.readyInputCount ?? null,
      inputCount: missingInputsIntake?.executiveSummary?.inputCount ?? missingInputsKit?.executiveSummary?.inputCount ?? null,
      createsPrivateFiles: false,
      asksApproval: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextHumanAction: 'supply_requested_inputs_only_not_approval',
      nextSafeAction: 'collect_missing_inputs_without_approval_or_execution',
    },
    requests,
    postInputCommands: buildPostInputCommands({ missingInputsKit, missingInputsIntake }),
    hardStops: [
      'This request bundle is not approval.',
      'Do not paste private emails, exact people, exact facts or final public URLs into public reports.',
      'Supplying inputs does not authorize seed sends, CRM writes, group assignments, workflows, subscribers or public sends.',
      'Supplying final public links or subscription policy does not authorize MailerLite UI edits, test sends, public sends or audience sends.',
      'No live MailerLite, Shopify, CRM, UI, API, ledger, card, scoring or Fact Store action is allowed from this bundle.',
      'After inputs exist, rerun the redacted intake and regenerate the relevant packets locally before asking for any later exact approval.',
    ],
    sourceDigests,
    safety,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (bundle) => {
  const lines = [
    '# MailerLite Launch OS Missing Inputs Request Bundle',
    '',
    `Generated: ${bundle.generatedAt}`,
    `Status: ${bundle.status}`,
    '',
    '## Summary',
    '',
    `- Request count: ${bundle.executiveSummary.requestCount}`,
    `- Copy blocks ready: ${bundle.executiveSummary.copyBlocksReady}`,
    `- Inputs ready: ${bundle.executiveSummary.readyInputCount ?? 'unknown'}/${bundle.executiveSummary.inputCount ?? 'unknown'}`,
    `- Creates private files: ${bundle.executiveSummary.createsPrivateFiles}`,
    `- Asks approval: ${bundle.executiveSummary.asksApproval}`,
    `- Can ask approval now: ${bundle.executiveSummary.canAskApprovalNow}`,
    `- Next human action: ${bundle.executiveSummary.nextHumanAction}`,
    '',
    '## Copy-Ready Requests',
    '',
  ];

  for (const request of bundle.requests) {
    lines.push(`### ${request.id}`);
    lines.push('');
    lines.push(`Audience: ${request.audience}`);
    lines.push(`Status now: ${request.statusNow}`);
    lines.push(`Approval effect: ${request.approvalEffect}`);
    lines.push('');
    lines.push(request.copyReadyText);
    lines.push('');
    lines.push(`Collection rule: ${request.collectionRule}`);
    lines.push(`Target path or field: ${request.templatePathSuggestion ?? request.targetField ?? 'none'}`);
    lines.push(`Blockers: ${request.blockers.join(', ') || 'none'}`);
    lines.push('');
  }

  lines.push('## Post-Input Commands');
  lines.push('');
  lines.push(renderList(bundle.postInputCommands));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  lines.push(renderList(bundle.hardStops));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Local-only report.');
  lines.push('- No private input files created.');
  lines.push('- No approval requested.');
  lines.push('- No live APIs, UI, subscribers, groups, workflows, sends, CRM writes, scoring or Fact Store writes.');
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

const buildMissingInputsRequestBundleFromFiles = async (options) => {
  const [missingInputsKit, missingInputsIntake, blockedGateHandoff, sourceDigests] = await Promise.all([
    readJson(options.missingInputsKit),
    readJson(options.missingInputsIntake),
    readJson(options.blockedGateHandoff),
    Promise.all([
      publicDigest(options.missingInputsKit, 'expected missing-input specs and post-input commands'),
      publicDigest(options.missingInputsIntake, 'redacted current input state and blockers'),
      publicDigest(options.blockedGateHandoff, 'blocked gate ids and exact input ids'),
    ]),
  ]);

  return buildMissingInputsRequestBundle({
    missingInputsKit,
    missingInputsIntake,
    blockedGateHandoff,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const bundle = await buildMissingInputsRequestBundleFromFiles(options);
  if (options.out) await writeJson(options.out, bundle);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(bundle));

  console.log(JSON.stringify({
    ok: bundle.ok,
    status: bundle.status,
    generatedAt: bundle.generatedAt,
    requestCount: bundle.executiveSummary.requestCount,
    copyBlocksReady: bundle.executiveSummary.copyBlocksReady,
    asksApproval: bundle.executiveSummary.asksApproval,
    createsPrivateFiles: bundle.executiveSummary.createsPrivateFiles,
    canAskApprovalNow: bundle.executiveSummary.canAskApprovalNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: bundle.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS missing-inputs request bundle failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildMissingInputsRequestBundle,
  buildRequestBlocks,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
