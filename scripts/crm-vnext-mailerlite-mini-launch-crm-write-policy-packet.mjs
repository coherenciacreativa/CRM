#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-crm-write-policy-packet-2026-05-28';
const DEFAULT_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-crm-write-policy-packet.mjs [options]

Options:
  --signal-projection-packet <path>  CRM signal projection packet. Defaults to ${DEFAULT_SIGNAL_PROJECTION_PACKET}
  --event-contract <path>            Mini-launch event contract. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --out <path>                       Write JSON packet
  --markdown-out <path>              Write Markdown packet
  --help                             Show this help

Local-only CRM write policy packet for one MailerLite mini-launch. It defines
which future CRM write families can be considered after real observed events
exist. It does not approve or execute Signal Ledger, card, scoring, Fact Store,
MailerLite, Shopify, subscriber, workflow, send or outbound operations.`;

const parseArgs = (argv) => {
  const options = {
    signalProjectionPacket: DEFAULT_SIGNAL_PROJECTION_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--signal-projection-packet') options.signalProjectionPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const sourceDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const content = await readFile(resolved, 'utf8');
  return {
    path: resolved,
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const launchFrom = (projectionPacket, eventContract) => ({
  launchId: projectionPacket?.launch?.launchId ?? eventContract?.launch?.launchId ?? null,
  resourceName: projectionPacket?.launch?.resourceName ?? eventContract?.launch?.resourceName ?? null,
  resourceType: projectionPacket?.launch?.resourceType ?? eventContract?.launch?.resourceType ?? null,
});

const eventKindsFrom = ({ projectionPacket, eventContract }) => {
  const projectable = projectionPacket?.projectionModel?.currentProjectionReadyFor ?? [];
  const storeOnly = projectionPacket?.projectionModel?.storeOnlyNow ?? [];
  const contractKinds = (eventContract?.sampleSignalEvents ?? []).map((event) => cleanString(event?.eventKind));
  return {
    projectable: unique(projectable),
    storeOnly: unique(storeOnly),
    contractKinds: unique(contractKinds),
    allKnown: unique([...storeOnly, ...projectable, ...contractKinds]),
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildCrmWritePolicyPacket = ({
  signalProjectionPacket,
  eventContract,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(signalProjectionPacket, eventContract);
  const eventKinds = eventKindsFrom({ projectionPacket: signalProjectionPacket, eventContract });
  const nonScoringReceiptKinds = unique([
    'mini_launch_intake_created',
    'source_assigned',
    'resource_delivered',
    'content_sent',
    ...eventKinds.storeOnly,
  ]);
  const scoreableAfterObservedKinds = eventKinds.projectable.filter((kind) => ![
    'source_assigned',
    'resource_delivered',
    'content_sent',
  ].includes(kind));

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_crm_write_policy_packet',
    generatedAt,
    ok: true,
    status: 'crm_write_policy_packet_ready_no_live_changes',
    launch,
    executiveSummary: {
      policyReady: true,
      approvalRequestReady: false,
      operationsExecuted: 0,
      blockersResolvedIfConsumed: [
        'card_write_policy_packet_missing',
        'identity_stitching_packet_missing',
        'scoring_policy_for_mini_launch_missing',
        'source_delivered_receipts_must_not_score_by_themselves',
      ],
      blockersStillRequireRealEvidence: [
        'real_observed_event_file_missing',
        'exact_observed_events_missing',
        'exact_person_identity_missing',
        'observed_events_not_all_writable_or_contain_samples',
        'aggregate_market_review_missing',
        'exact_fact_store_facts_missing',
        'fact_store_write_approval_missing',
      ],
    },
    policyCoverage: {
      cardWritePolicyPacketReady: true,
      identityStitchingPacketReady: true,
      scoringPolicyForMiniLaunchReady: true,
      sourceDeliveredReceiptsMustNotScoreByThemselves: true,
      aggregateMarketReviewPolicyReady: true,
      factStoreWritePolicyReady: true,
    },
    eventKindPolicy: {
      allKnownEventKinds: eventKinds.allKnown,
      ledgerEligibleAfterExactApproval: eventKinds.allKnown,
      cardHistoryEligibleAfterExactPersonApproval: eventKinds.projectable,
      scoreableOnlyAfterObservedEvidence: scoreableAfterObservedKinds,
      neverScoreByThemselves: nonScoringReceiptKinds,
      factStoreEligibleOnlyAfterAggregateReview: [
        'market_signal_reviewed',
        'continue_or_archive_decision',
      ],
    },
    cardWritePolicy: {
      ready: true,
      allowedOnlyAfter: [
        'real observed event file exists',
        'one exact CRM person identity is present per event',
        'card apply preview lists exact target card id and exact field paths',
        'Alejandro gives a separate exact card-write approval phrase',
      ],
      prohibitedByThisPolicy: [
        'creating a new card from sample events',
        'enriching cards from Source or Delivered receipts alone',
        'bundling card writes with scoring, Fact Store, MailerLite, Shopify, subscribers, workflows or sends',
      ],
    },
    identityStitchingPolicy: {
      ready: true,
      acceptedIdentityKeys: ['personId', 'email', 'instagramHandle'],
      rule: 'At least one exact identity key is required per event; sample identities and fuzzy-only matches are not writable.',
      stillRequiresPerPersonEvidence: true,
    },
    scoringPolicy: {
      ready: true,
      sourceDeliveredReceiptScore: 0,
      contentSentReceiptScore: 0,
      emailOpenPolicy: 'attention_only_low_confidence; never enough alone for interest or purchase intent',
      emailClickPolicy: 'engagement_signal_after_observed_event_and_exact_person',
      emailReplyPolicy: 'high_quality_signal_after_observed_event_and_exact_person',
      instagramEngagementPolicy: 'contextual_signal_after_observed_snapshot_and_exact_person',
      stillRequiresExactDeltasBeforeApproval: true,
    },
    factStorePolicy: {
      ready: true,
      allowedOnlyAfter: [
        'aggregate market review summarizes real observed events',
        'exact facts and evidence ids are listed',
        'Alejandro gives a separate exact Fact Store approval phrase',
      ],
      prohibitedByThisPolicy: [
        'writing facts from sample events',
        'writing aggregate learning from one unreviewed receipt',
        'bundling Fact Store writes with person-card/scoring/subscriber actions',
      ],
    },
    hardStops: [
      'This packet is policy, not approval.',
      'It cannot create observed events or exact person identities.',
      'It cannot authorize CRM writes, scoring, Fact Store writes, MailerLite mutations, Shopify actions, subscribers, workflows or sends.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (packet) => [
  '# MailerLite Mini-Launch - CRM Write Policy Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: \`${packet.status}\``,
  '',
  `Launch: \`${packet.launch.resourceName}\` (\`${packet.launch.launchId}\`)`,
  '',
  '## Policy Coverage',
  '',
  ...Object.entries(packet.policyCoverage).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Blockers This Packet Resolves When Consumed',
  '',
  renderList(packet.executiveSummary.blockersResolvedIfConsumed),
  '',
  '## Blockers Still Requiring Real Evidence',
  '',
  renderList(packet.executiveSummary.blockersStillRequireRealEvidence),
  '',
  '## Non-Scoring Receipts',
  '',
  renderList(packet.eventKindPolicy.neverScoreByThemselves),
  '',
  '## Safety',
  '',
  '- Local-only policy packet.',
  '- No CRM write, Signal Ledger append, scoring, Fact Store write, subscriber action, workflow change, send, MailerLite mutation, Shopify action or outbound.',
  '',
].join('\n');

const writeOutput = async (path, content) => {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return absolutePath;
};

const buildFromFiles = async (options) => {
  const [signalProjectionPacket, eventContract, signalDigest, contractDigest] = await Promise.all([
    readJson(options.signalProjectionPacket),
    readJson(options.eventContract),
    sourceDigest(options.signalProjectionPacket, 'no-live CRM signal projection packet'),
    sourceDigest(options.eventContract, 'mini-launch event contract and sample-only event shapes'),
  ]);

  return buildCrmWritePolicyPacket({
    signalProjectionPacket,
    eventContract,
    sourceDigests: [signalDigest, contractDigest],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildFromFiles(options);
  if (options.out) await writeOutput(options.out, `${JSON.stringify(packet, null, 2)}\n`);
  if (options.markdownOut) await writeOutput(options.markdownOut, renderMarkdown(packet));
  console.log(JSON.stringify({
    status: packet.status,
    policyReady: packet.executiveSummary.policyReady,
    blockersResolvedIfConsumed: packet.executiveSummary.blockersResolvedIfConsumed,
    blockersStillRequireRealEvidence: packet.executiveSummary.blockersStillRequireRealEvidence,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext mailerlite mini-launch CRM write policy packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCrmWritePolicyPacket,
  eventKindsFrom,
  parseArgs,
  renderMarkdown,
};
