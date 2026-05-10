#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/evidence-approval-application';

const usage = `Usage:
  node scripts/crm-vnext-evidence-approval-application.mjs --text <text> --select-email <email=option> [options]
  node scripts/crm-vnext-evidence-approval-application.mjs --text-file <path> --decision-file <json> [options]

Options:
  --api-url <url>              Evidence approval application API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>                CRM facts/report text
  --text-file <path>           Local text file with CRM facts/report text
  --evidence-file <path>       JSON file with connected evidenceSources from read-only searches
  --decision-file <path>       JSON array/object with decisions
  --select-email <email=option>
                              Add one email ownership decision. Can be repeated.
  --decision-ledger-path <path>
                              Local evidence-review decisions JSONL ledger to read/apply/write
  --source-kind <kind>         alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>            Reporter name, e.g. Alejandro or Juana
  --channel <channel>          Channel name, e.g. codex
  --approved-by <name>         Required with --write
  --include-expanded-sources   Search expanded local evidence sources
  --write                      Commit decisions to the local evidence decision ledger
  --fail-on-blocked            Exit non-zero when any approval item remains blocked after application
  --help                       Show this help

Decision options:
  confirm_email_for_subject
  keep_email_unassigned_family_or_companion
  create_related_person_candidate
  ask_for_more_evidence
  ignore_candidate

This command applies evidence-review decisions only to the local decision ledger. It never mutates person cards, never writes Fact Store, never sends outbound messages, and never calls live Gmail/Drive/MailerLite APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    evidenceFile: null,
    decisionFile: null,
    selectedEmails: [],
    decisionLedgerPath: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    approvedBy: null,
    includeExpandedSources: false,
    write: false,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--decision-file') options.decisionFile = argv[++index];
    else if (arg === '--select-email') options.selectedEmails.push(argv[++index]);
    else if (arg === '--decision-ledger-path') options.decisionLedgerPath = argv[++index];
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
  return { candidateEmail, selectedOptionId };
});

const runApplication = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('evidence_approval_application_text_required');
  const decisions = [
    ...await readDecisionFile(options),
    ...selectedEmailDecisions(options),
  ];
  if (!decisions.length) throw new Error('evidence_approval_application_decisions_required');
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');
  const evidenceSources = await readEvidenceSources(options);
  const apiUrl = new URL(options.apiUrl);
  if (options.decisionLedgerPath) {
    apiUrl.searchParams.set('decisionLedgerPath', resolve(options.decisionLedgerPath));
  }

  const response = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      evidenceSources,
      decisions,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
      approvedBy: options.approvedBy,
      commit: options.write,
    }),
  });
  if (!response.ok) throw new Error(`evidence_approval_application_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`evidence_approval_application_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactItem = (item) => ({
  batchItemId: item.batchItemId,
  status: item.status,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subjectLabel,
  openQuestions: item.openQuestions,
  approvalScopes: item.approvalScopes,
});

const compactApplication = (application, source) => ({
  ok: true,
  mode: application.mode,
  generatedAt: application.generatedAt,
  committed: application.committed,
  source,
  decisionAppend: {
    mode: application.decisionAppend.mode,
    committed: application.decisionAppend.committed,
    incoming: application.decisionAppend.incoming,
    added: application.decisionAppend.added.map((decision) => ({
      decisionRecordId: decision.decisionRecordId,
      subject: decision.subject,
      candidateEmail: decision.candidateEmail,
      selectedOptionId: decision.selectedOptionId,
      effect: decision.effect,
    })),
    duplicatesSkipped: application.decisionAppend.duplicatesSkipped.map((decision) => decision.decisionRecordId),
    invalidSelections: application.decisionAppend.invalidSelections,
    summaryAfter: application.decisionAppend.summaryAfter,
  },
  before: application.before.summary,
  after: application.after.summary,
  delta: application.delta,
  resolvedEvidenceQuestions: application.resolvedEvidenceQuestions,
  statusTransitions: application.statusTransitions,
  effectiveEvidenceReviewDecisions: application.effectiveEvidenceReviewDecisions,
  afterApprovalItems: application.after.approvalItems.map(compactItem),
  safety: application.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runApplication(options);
  console.log(JSON.stringify(compactApplication(payload.application, payload.source), null, 2));

  if (options.failOnBlocked && payload.application.after.summary.readyForHumanApproval !== payload.application.after.summary.items) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext evidence-approval-application failed: ${error.message}`);
  process.exitCode = 1;
});
