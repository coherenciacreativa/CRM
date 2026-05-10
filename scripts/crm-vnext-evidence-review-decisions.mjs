#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/evidence-review-decisions';

const usage = `Usage:
  node scripts/crm-vnext-evidence-review-decisions.mjs [options]

List mode:
  node scripts/crm-vnext-evidence-review-decisions.mjs

Append preview/write mode:
  node scripts/crm-vnext-evidence-review-decisions.mjs --packet-file <packet.json> --select-email <email=option> [--write --approved-by <name>]
  node scripts/crm-vnext-evidence-review-decisions.mjs --text <text> --evidence-file <evidence.json> --select-email <email=option>

Options:
  --api-url <url>              Evidence decision ledger API URL. Defaults to ${DEFAULT_API_URL}
  --limit <n>                  Decisions to return in list mode. Default 25, max 100
  --ledger-path <path>         Local ledger path override, loopback/dev only
  --text <text>                CRM facts/report text to build a review packet when no packet-file is supplied
  --text-file <path>           Local text file for review packet construction
  --packet-file <path>         JSON packet from crm:vnext:evidence-review-packet
  --evidence-file <path>       JSON file with connected evidenceSources from read-only searches
  --decision-file <path>       JSON array/object with decisions
  --select-email <email=option>
                              Add one email ownership decision. Can be repeated.
  --source-kind <kind>         alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>            Reporter name, e.g. Alejandro or Juana
  --channel <channel>          Channel name, e.g. codex
  --approved-by <name>         Required with --write
  --write                      Commit decisions to the local ledger
  --help                       Show this help

Options include:
  confirm_email_for_subject
  keep_email_unassigned_family_or_companion
  create_related_person_candidate
  ask_for_more_evidence
  ignore_candidate

This command is local-only. It stores review decisions, not card changes. It never mutates person cards, writes Fact Store, sends outbound messages, or calls live Gmail/Drive/MailerLite APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    limit: 25,
    ledgerPath: null,
    text: null,
    textFile: null,
    packetFile: null,
    evidenceFile: null,
    decisionFile: null,
    selectedEmails: [],
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    approvedBy: null,
    write: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 100) : 25;
    } else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--packet-file') options.packetFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--decision-file') options.decisionFile = argv[++index];
    else if (arg === '--select-email') options.selectedEmails.push(argv[++index]);
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
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

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  return null;
};

const readEvidenceSources = async (options) => {
  if (!options.evidenceFile) return [];
  const parsed = await readJson(options.evidenceFile);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) return parsed.evidenceSources;
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const readPacket = async (options) => {
  if (!options.packetFile) return null;
  return readJson(options.packetFile);
};

const readDecisionFile = async (options) => {
  if (!options.decisionFile) return [];
  const parsed = await readJson(options.decisionFile);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.decisions)) return parsed.decisions;
  throw new Error('decision_file_must_be_array_or_object_with_decisions');
};

const selectedEmailDecisions = (options) => options.selectedEmails.map((entry) => {
  const [candidateEmail, selectedOptionId] = entry.split('=');
  if (!candidateEmail || !selectedOptionId) throw new Error(`invalid_select_email:${entry}`);
  return {
    candidateEmail,
    selectedOptionId,
  };
});

const withLedgerPath = (url, options) => {
  const next = new URL(url);
  if (options.ledgerPath) next.searchParams.set('ledgerPath', options.ledgerPath);
  return next;
};

const listLedger = async (options) => {
  const url = withLedgerPath(options.apiUrl, options);
  url.searchParams.set('limit', String(options.limit));
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`evidence_review_decisions_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`evidence_review_decisions_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const appendLedger = async (options) => {
  const packet = await readPacket(options);
  const decisions = [
    ...await readDecisionFile(options),
    ...selectedEmailDecisions(options),
  ];
  const text = await readText(options);
  const evidenceSources = await readEvidenceSources(options);
  const url = withLedgerPath(options.apiUrl, options);

  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      packet,
      decisions,
      text,
      evidenceSources,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      commit: options.write,
      approvedBy: options.approvedBy,
    }),
  });
  if (!response.ok) throw new Error(`evidence_review_decisions_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`evidence_review_decisions_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactDecision = (decision) => ({
  decisionRecordId: decision.decisionRecordId,
  decidedAt: decision.decidedAt,
  approvedBy: decision.approvedBy,
  subject: decision.subject,
  candidateEmail: decision.candidateEmail,
  selectedOptionId: decision.selectedOptionId,
  selectedOptionLabel: decision.selectedOptionLabel,
  relatedPersonName: decision.relatedPersonName,
  effect: decision.effect,
  safety: decision.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');

  const hasAppendInput = Boolean(options.packetFile || options.text || options.textFile || options.decisionFile || options.selectedEmails.length);
  const payload = hasAppendInput ? await appendLedger(options) : await listLedger(options);

  if (payload.ledger) {
    console.log(JSON.stringify({
      ok: true,
      mode: payload.ledger.mode,
      generatedAt: payload.ledger.generatedAt,
      summary: payload.ledger.summary,
      decisions: payload.ledger.decisions.map(compactDecision),
      safety: payload.ledger.safety,
    }, null, 2));
    return;
  }

  const result = payload.result;
  console.log(JSON.stringify({
    ok: true,
    mode: result.mode,
    committed: result.committed,
    decisionBatchId: result.decisionBatchId,
    incoming: result.incoming,
    added: result.added.map(compactDecision),
    duplicatesSkipped: result.duplicatesSkipped.map((decision) => decision.decisionRecordId),
    invalidSelections: result.invalidSelections,
    summaryAfter: result.summaryAfter,
    safety: result.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext evidence-review-decisions failed: ${error.message}`);
  process.exitCode = 1;
});
