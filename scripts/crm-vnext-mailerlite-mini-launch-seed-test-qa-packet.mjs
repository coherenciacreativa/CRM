#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-test-qa-packet-2026-05-27';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_SHOPIFY_PROTOCOL = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs [options]

Options:
  --rehearsal-packet <path>     Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --event-contract <path>       Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --email-style-canon <path>    Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --shopify-protocol <path>     Shopify preview protocol. Defaults to ${DEFAULT_SHOPIFY_PROTOCOL}
  --group-dictionary <path>     Brand MailerLite group dictionary. Defaults to ${DEFAULT_GROUP_DICTIONARY}
  --control-room <path>         CRM MailerLite Launch OS control room. Defaults to ${DEFAULT_CONTROL_ROOM}
  --test-email <email>          Optional future seed email. Redacted in report.
  --out <path>                  Write JSON packet
  --markdown-out <path>         Write Markdown packet
  --help                        Show this help

Local-only QA and seed-test packet for one Mini-Launch OS rehearsal. It defines
the gates, QA checklist, and approval boundaries before any MailerLite,
Shopify, CRM, subscriber, workflow, form, ledger, or send mutation.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  const [domainName, ...domainRest] = domain.split('.');
  const localPrefix = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`;
  return `${localPrefix}@${domainName[0] ?? '*'}***.${domainRest.at(-1) ?? '***'}`;
};

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    shopifyProtocol: DEFAULT_SHOPIFY_PROTOCOL,
    groupDictionary: DEFAULT_GROUP_DICTIONARY,
    controlRoom: DEFAULT_CONTROL_ROOM,
    testEmail: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--shopify-protocol') options.shopifyProtocol = argv[++index];
    else if (arg === '--group-dictionary') options.groupDictionary = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--test-email') options.testEmail = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  const normalizedEmail = normalizeEmail(options.testEmail);
  if (options.testEmail && !normalizedEmail) throw new Error('invalid_test_email');
  options.testEmail = normalizedEmail;
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const digestSource = (path, content) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor: path.includes('email_style_canon')
    ? 'Email creative QA and visual/editorial canon'
    : path.includes('SHOPIFY_PREVIEW')
      ? 'Shopify preview default and live-publish boundary'
      : path.includes('GROUP_DICTIONARY')
        ? 'MailerLite group status and naming authority'
        : path.includes('control-room')
          ? 'current Launch OS board map and approval gates'
          : 'mini-launch rehearsal or event contract state',
});

const loadSourceDigests = async (options) => {
  const paths = [
    options.rehearsalPacket,
    options.eventContract,
    options.emailStyleCanon,
    options.shopifyProtocol,
    options.groupDictionary,
    options.controlRoom,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push(digestSource(path, content));
  }
  return digests;
};

const launchFrom = (rehearsalPacket, eventContract) => ({
  launchId: rehearsalPacket?.launch?.launchId ?? eventContract?.launch?.launchId,
  resourceName: rehearsalPacket?.launch?.resourceName ?? eventContract?.launch?.resourceName,
  resourceType: rehearsalPacket?.launch?.resourceType ?? eventContract?.launch?.resourceType,
  sourceGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name
    ?? eventContract?.launch?.sourceGroupCandidate
    ?? null,
  deliveredGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name
    ?? eventContract?.launch?.deliveredGroupCandidate
    ?? null,
});

const findApprovalGate = (rehearsalPacket, gate) =>
  rehearsalPacket?.approvalQueue?.find((item) => item?.gate === gate) ?? null;

const buildQaSurfaces = (rehearsalPacket) => ({
  publicSurfaces: rehearsalPacket?.publicSurfaceGuardrails?.publicSurfaces ?? [
    'landing',
    'resource',
    'email body',
    'thank-you page',
    'caption_or_dm_copy',
  ],
  internalSurfaces: rehearsalPacket?.publicSurfaceGuardrails?.internalSurfaces ?? [
    'strategy notes',
    'CRM fields',
    'MailerLite groups',
    'tags',
    'automation plan',
    'QA receipt',
  ],
  bannedInternalTermsInPublicCopy: rehearsalPacket?.publicSurfaceGuardrails?.bannedInternalTermsInPublicCopy ?? [
    'lead magnet',
    'CRM',
    'MailerLite',
    'tag',
    'automatizacion',
  ],
});

const buildSeedTestModes = ({ launch, testEmailRedacted }) => [
  {
    id: 'asset_only_seed_preview',
    purpose: 'Verify copy, visual style, footer/legal, links and mobile rendering before receipts or automation routing.',
    allowedOnlyAfterApproval: [
      'send exactly one MailerLite UI/API test email to the approved seed address',
      'read the seed inbox or supplied screenshot for QA evidence',
    ],
    doesNotTest: [
      'Source receipt assignment',
      'Delivered receipt assignment',
      'subscriber routing',
      'workflow activation',
      'public capture',
    ],
    currentReadiness: testEmailRedacted ? 'needs_assets_and_exact_send_approval' : 'needs_seed_email_assets_and_exact_send_approval',
  },
  {
    id: 'receipt_seed_test',
    purpose: 'Verify the minimum end-to-end receipt lane for one approved test subscriber only.',
    allowedOnlyAfterApproval: [
      `create/update only the approved seed subscriber${testEmailRedacted ? ` (${testEmailRedacted})` : ''}`,
      `assign Source candidate only if live and approved: ${launch.sourceGroupCandidate}`,
      `assign Delivered candidate only if live and approved: ${launch.deliveredGroupCandidate}`,
      'send only the approved seed test email step',
      'verify receipt/inbox/readback without touching audience',
    ],
    doesNotTest: [
      'real audience launch',
      'active onboarding handoff',
      'public Shopify form capture',
      'CRM card/scoring mutation',
    ],
    currentReadiness: 'blocked_until_candidate_groups_and_seed_scope_are_approved',
  },
  {
    id: 'crm_signal_dry_run',
    purpose: 'Convert seed-test observations into sample Signal Event Ledger input without appending to the ledger.',
    allowedOnlyAfterApproval: [
      'normalize supplied seed observations locally',
      'compare observed events against the mini-launch event contract',
      'produce a market-learning review packet',
    ],
    doesNotTest: [
      'CRM card writes',
      'score mutation',
      'Fact Store write',
      'outbound follow-up',
    ],
    currentReadiness: 'ready_after_seed_observations_exist_no_live_write',
  },
];

const buildQaChecklist = ({ launch, rehearsalPacket, eventContract }) => {
  const eventKinds = new Set(eventContract?.eventContract?.map((item) => item.eventKind) ?? []);
  return {
    brandCreativeQa: [
      'Email feels like an editorial letter from Alejandro, not a generic MailerLite template.',
      'Poppins body, Georgia accent where useful, #474747 body text, #F4F7FA outer background and white container are approximated or limitation is declared.',
      'One main CTA; no default MailerLite blue button if a button is used.',
      'Visual signature of Alejandro is included when available, or marked explicitly pending.',
      'Footer/legal is reviewed, intentional, and not visually broken.',
      'Public copy avoids internal terms and does not overuse the AI-ish "a veces" formula.',
    ],
    shopifyWebQa: [
      'Preview/draft is Shopify-first or exact Web Design handoff; loose HTML is not treated as final.',
      'Mobile-first check is done for landing, quiz, result and thank-you states.',
      'No live form, payment, public publish, or real CRM tag is connected without separate approval.',
      `All public surfaces keep launch_id ${launch.launchId} out of customer-facing copy.`,
    ],
    mailerLiteFunctionalQa: [
      'Fresh read-only scan is required before any live create/assign/send operation.',
      `Source group candidate is treated as candidate until explicitly created/verified: ${launch.sourceGroupCandidate}`,
      `Delivered group candidate is treated as candidate until explicitly created/verified: ${launch.deliveredGroupCandidate}`,
      'A seed send may test creative rendering before receipts, but it must be labeled asset-only.',
      'A receipt seed test may touch only the approved seed subscriber and approved candidate groups.',
      'No workflow activation, no audience send, no Onboarding v1/V2 routing.',
    ],
    crmDataQa: [
      `Primary key is ${rehearsalPacket?.dataPlan?.primaryKey ?? `experiment.launch_id=${launch.launchId}`}.`,
      eventKinds.has('email_submitted') ? 'Email capture event exists in contract.' : 'Email capture event is missing from contract.',
      eventKinds.has('quiz_or_game_completed') ? 'Quiz completion/result event exists in contract.' : 'Quiz completion/result event is missing from contract.',
      eventKinds.has('resource_delivered') ? 'Delivery receipt event exists in contract and remains store-only.' : 'Delivery receipt event is missing from contract.',
      eventKinds.has('email_click') ? 'Email click can project through existing engagement pipeline.' : 'Email click projection is missing.',
      eventKinds.has('market_signal_reviewed') ? 'Market-learning review event exists and stays store-only.' : 'Market-learning review event is missing.',
      'No card write, score mutation, Fact Store write or outbound is allowed from seed evidence alone.',
    ],
  };
};

const buildApprovalMatrix = ({ rehearsalPacket, launch, testEmailRedacted }) => {
  const gate = (id) => findApprovalGate(rehearsalPacket, id);
  return [
    {
      id: 'brand_approve_brief_and_public_copy',
      owner: 'Brand Hub',
      currentStatus: gate('brand_approve_brief_and_public_copy')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'any public-facing asset, Shopify preview, or MailerLite seed test reuse',
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'shopify_preview_draft',
      owner: 'Web Design / Shopify',
      currentStatus: 'closed_until_brand_copy_and_preview_scope',
      requiredBefore: 'any web/quiz preview outside local handoff',
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'candidate_group_creation_dry_run',
      owner: 'CRM / MailerLite planner',
      currentStatus: 'not_run_for_this_launch',
      requiredBefore: `creating ${launch.sourceGroupCandidate} or ${launch.deliveredGroupCandidate}`,
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: false,
    },
    {
      id: 'create_empty_mailerlite_groups',
      owner: 'MailerLite',
      currentStatus: gate('create_empty_mailerlite_groups')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'receipt seed test with Source/Delivered assignment',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'asset_only_seed_email_send',
      owner: 'MailerLite UI/API',
      currentStatus: testEmailRedacted ? 'needs_exact_send_approval' : 'needs_seed_email_and_exact_send_approval',
      requiredBefore: 'sending one creative/rendering test email to a seed address',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'receipt_seed_subscriber_and_groups',
      owner: 'MailerLite',
      currentStatus: 'closed_until_groups_seed_email_and_exact_scope',
      requiredBefore: 'creating/updating one seed subscriber and assigning candidate receipt groups',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'crm_signal_ledger_append',
      owner: 'CRM',
      currentStatus: 'closed_until_real_seed_observations_and_write_approval',
      requiredBefore: 'persisting seed observations to Signal Event Ledger',
      liveMutationIfApproved: false,
      localMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'audience_launch',
      owner: 'Alejandro',
      currentStatus: gate('audience_launch')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'public send, form connection, Shopify publish, or audience routing',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
  ];
};

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  workflowMutationsPerformed: false,
  formMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildSeedTestQaPacket = ({
  rehearsalPacket,
  eventContract,
  sourceDigests,
  testEmail = null,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, eventContract);
  const testEmailRedacted = redactEmail(testEmail);
  const eventContractReady = eventContract?.status === 'mini_launch_event_contract_ready_no_ledger_write'
    && eventContract?.ok === true;
  const rehearsalReady = rehearsalPacket?.status === 'mini_launch_rehearsal_ready_no_live_changes'
    && rehearsalPacket?.ok === true;
  const qaChecklist = buildQaChecklist({ launch, rehearsalPacket, eventContract });
  const approvalMatrix = buildApprovalMatrix({ rehearsalPacket, launch, testEmailRedacted });
  const blockersBeforeAnySeedSend = [
    'Brand-approved public/email copy does not exist yet in this packet.',
    'Email Style QA has not been marked green for this mini-launch.',
    'MailerLite asset/draft does not exist yet.',
    'No exact seed-send approval has been given.',
  ];
  if (!testEmailRedacted) blockersBeforeAnySeedSend.push('No seed email is supplied in this packet.');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_seed_test_qa_packet',
    generatedAt,
    ok: rehearsalReady && eventContractReady,
    status: rehearsalReady && eventContractReady
      ? 'seed_test_qa_packet_ready_no_live_changes'
      : 'seed_test_qa_packet_needs_rehearsal_or_event_contract',
    launch,
    seedIdentity: {
      supplied: Boolean(testEmailRedacted),
      redactedEmail: testEmailRedacted,
      rule: 'Never print full seed email in reports unless the user explicitly asks for a private execution packet.',
    },
    readiness: {
      rehearsalReady,
      eventContractReady,
      readyForLocalAssetDrafting: rehearsalReady && eventContractReady,
      readyForAssetOnlySeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
      blockersBeforeAnySeedSend,
      blockersBeforeReceiptSeedTest: [
        'Source/Delivered candidate groups are not proven live for this launch.',
        'No fresh read-only MailerLite scan exists for this launch-specific group plan.',
        'No exact approval exists to create/update the seed subscriber or assign groups.',
        'No exact approval exists to send a seed email for this launch.',
      ],
    },
    seedTestModes: buildSeedTestModes({ launch, testEmailRedacted }),
    qaSurfaces: buildQaSurfaces(rehearsalPacket),
    qaChecklist,
    approvalMatrix,
    nextActionRecommendation: {
      id: 'brand_and_email_asset_packet_before_seed',
      reason: 'A seed test is only worth running after the public copy and email style are good enough to inspect. Otherwise we test plumbing before there is a real agency-quality piece to judge.',
      nextNoLiveMove: 'Produce polished Brand/email copy plus MailerLite asset spec for Email 1, then regenerate this packet with exact seed scope.',
    },
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Seed-Test QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id: ${packet.launch.launchId}`,
    '',
    'Este packet deja preparado el ensayo sin tocar produccion. Separa prueba de assets, prueba de recibos, señales CRM y lanzamiento publico para que Mantis no confunda un test con un lanzamiento real.',
    '',
    '## Readiness',
    '',
    `- Rehearsal ready: ${packet.readiness.rehearsalReady}`,
    `- Event contract ready: ${packet.readiness.eventContractReady}`,
    `- Ready for local asset drafting: ${packet.readiness.readyForLocalAssetDrafting}`,
    `- Ready for asset-only seed send now: ${packet.readiness.readyForAssetOnlySeedSendNow}`,
    `- Ready for receipt seed test now: ${packet.readiness.readyForReceiptSeedTestNow}`,
    `- Ready for audience launch now: ${packet.readiness.readyForAudienceLaunchNow}`,
    '',
    'Blockers before any seed send:',
    renderList(packet.readiness.blockersBeforeAnySeedSend),
    '',
    'Blockers before receipt seed test:',
    renderList(packet.readiness.blockersBeforeReceiptSeedTest),
    '',
    '## Seed-Test Modes',
    '',
  ];

  for (const mode of packet.seedTestModes) {
    lines.push(`### ${mode.id}`);
    lines.push(`- Purpose: ${mode.purpose}`);
    lines.push(`- Current readiness: ${mode.currentReadiness}`);
    lines.push('- Allowed only after approval:');
    for (const item of mode.allowedOnlyAfterApproval) lines.push(`  - ${item}`);
    lines.push('- Does not test:');
    for (const item of mode.doesNotTest) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## QA Checklist', '');
  for (const [section, items] of Object.entries(packet.qaChecklist)) {
    lines.push(`### ${section}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Approval Matrix', '');
  for (const gate of packet.approvalMatrix) {
    lines.push(`### ${gate.id}`);
    lines.push(`- Owner: ${gate.owner}`);
    lines.push(`- Current status: ${gate.currentStatus}`);
    lines.push(`- Required before: ${gate.requiredBefore}`);
    lines.push(`- Live mutation if approved: ${Boolean(gate.liveMutationIfApproved)}`);
    lines.push(`- Local mutation if approved: ${Boolean(gate.localMutationIfApproved)}`);
    lines.push(`- Approval needed from Alejandro: ${gate.approvalNeededFromAlejandro}`);
    lines.push('');
  }

  lines.push('## Next Recommended Move', '');
  lines.push(`- ${packet.nextActionRecommendation.id}: ${packet.nextActionRecommendation.nextNoLiveMove}`);
  lines.push(`- Reason: ${packet.nextActionRecommendation.reason}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
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

const buildPacketFromFiles = async (options) => {
  const [rehearsalPacket, eventContract, sourceDigests] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.eventContract),
    loadSourceDigests(options),
  ]);

  return buildSeedTestQaPacket({
    rehearsalPacket,
    eventContract,
    sourceDigests,
    testEmail: options.testEmail,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch.launchId,
    readyForLocalAssetDrafting: packet.readiness.readyForLocalAssetDrafting,
    readyForAssetOnlySeedSendNow: packet.readiness.readyForAssetOnlySeedSendNow,
    readyForReceiptSeedTestNow: packet.readiness.readyForReceiptSeedTestNow,
    readyForAudienceLaunchNow: packet.readiness.readyForAudienceLaunchNow,
    seedEmailSupplied: packet.seedIdentity.supplied,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed-test QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalMatrix,
  buildQaChecklist,
  buildSeedTestModes,
  buildSeedTestQaPacket,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
