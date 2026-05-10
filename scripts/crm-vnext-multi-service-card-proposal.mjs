#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/multi-service-card-proposal';

const usage = `Usage:
  node scripts/crm-vnext-multi-service-card-proposal.mjs --text <text> [options]
  node scripts/crm-vnext-multi-service-card-proposal.mjs --text-file <path> [options]

Options:
  --api-url <url>          Multi-service card proposal API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to convert into card proposals
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. telegram
  --fail-on-approval       Exit non-zero when any proposal requires identity or privacy approval
  --help                   Show this help

This command is read-only. It never mutates person cards, never writes Fact Store, and never calls live MailerLite/Instagram/ManyChat/WhatsApp/Telegram APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    failOnApproval: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-approval') options.failOnApproval = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const headers = () => {
  const result = { 'content-type': 'application/json' };
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    result['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }
  return result;
};

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  return null;
};

const runProposal = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('multi_service_card_proposal_text_required');

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
    }),
  });
  if (!response.ok) throw new Error(`multi_service_card_proposal_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`multi_service_card_proposal_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactProposal = (proposal) => ({
  proposalId: proposal.proposalId,
  personHint: proposal.personHint,
  target: proposal.target,
  services: proposal.serviceRelationships.map((service) => ({
    serviceKey: service.serviceKey,
    label: service.label,
    role: service.role,
    status: service.status,
    privacy: service.privacy,
    factIds: service.factIds,
  })),
  relationshipContexts: proposal.relationshipContexts.map((context) => context.code),
  privacyWarnings: proposal.privacyWarnings,
  multiService: proposal.multiService,
  approvals: {
    identity: proposal.identityApprovalRequired,
    privacy: proposal.privacyApprovalRequired,
    cardWritePolicy: proposal.cardWritePolicyRequired,
  },
  operations: proposal.proposedOperations.map((operation) => ({
    type: operation.type,
    targetPersonId: operation.targetPersonId,
    serviceKey: operation.serviceKey,
    approvalLevel: operation.approvalLevel,
    description: operation.description,
  })),
  recommendation: proposal.recommendation,
});

const compactReport = (report, source) => ({
  ok: true,
  mode: report.mode,
  generatedAt: report.generatedAt,
  source,
  summary: report.summary,
  research: {
    summary: report.research.summary,
    sourceCoverage: report.research.sourceCoverage,
    ambiguities: report.research.draft.ambiguities,
  },
  proposals: report.proposals.map(compactProposal),
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runProposal(options);
  console.log(JSON.stringify(compactReport(payload.proposal, payload.source), null, 2));

  if (
    options.failOnApproval
    && payload.proposal.proposals.some((proposal) => proposal.identityApprovalRequired || proposal.privacyApprovalRequired)
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext multi-service-card-proposal failed: ${error.message}`);
  process.exitCode = 1;
});
