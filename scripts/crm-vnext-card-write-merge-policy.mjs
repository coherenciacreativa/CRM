#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/card-write-merge-policy';

const usage = `Usage:
  node scripts/crm-vnext-card-write-merge-policy.mjs --text <text> [options]
  node scripts/crm-vnext-card-write-merge-policy.mjs --text-file <path> [options]

Options:
  --api-url <url>          Card write/merge policy API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to evaluate
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. codex
  --include-expanded-sources
                           Also search read-only local CSVs, retreat tables, downloads, and contact exports
  --evidence-file <path>   JSON file with connected evidenceSources from Gmail/contact/MailerLite read-only searches
  --fail-on-not-ready      Exit non-zero when no decision is ready for human-approved write
  --help                   Show this help

This command is read-only. It never mutates cards, never writes Fact Store, never sends outbound messages, and never calls live Gmail or MailerLite APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    includeExpandedSources: false,
    evidenceFile: null,
    failOnNotReady: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-not-ready') options.failOnNotReady = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
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

const readEvidenceSources = async (options) => {
  if (!options.evidenceFile) return [];
  const raw = await readFile(resolve(options.evidenceFile), 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) {
    return parsed.evidenceSources;
  }
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const runPolicy = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('card_write_merge_policy_text_required');
  const evidenceSources = await readEvidenceSources(options);

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
      evidenceSources,
    }),
  });
  if (!response.ok) throw new Error(`card_write_merge_policy_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`card_write_merge_policy_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactDecision = (decision) => ({
  decisionId: decision.decisionId,
  personHint: decision.personHint,
  target: decision.target,
  serviceKeys: decision.serviceKeys,
  evidenceAssessment: decision.evidenceAssessment,
  recommendedWrite: decision.recommendedWrite,
});

const compactReport = (policy, source) => ({
  ok: true,
  mode: policy.mode,
  generatedAt: policy.generatedAt,
  source,
  summary: policy.summary,
  sourceConsultationPolicy: policy.sourceConsultationPolicy,
  policyRules: policy.policyRules,
  decisions: policy.decisions.map(compactDecision),
  safety: policy.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runPolicy(options);
  console.log(JSON.stringify(compactReport(payload.policy, payload.source), null, 2));

  if (
    options.failOnNotReady
    && payload.policy.summary.readyForHumanApprovedWrite === 0
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext card-write-merge-policy failed: ${error.message}`);
  process.exitCode = 1;
});
