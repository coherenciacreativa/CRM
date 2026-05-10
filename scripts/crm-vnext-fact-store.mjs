#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/fact-store';

const usage = `Usage:
  node scripts/crm-vnext-fact-store.mjs [options]

List mode:
  node scripts/crm-vnext-fact-store.mjs

Append preview/write mode:
  node scripts/crm-vnext-fact-store.mjs --text <text> [--write --approved-by <name>]

Options:
  --api-url <url>          Fact store API URL. Defaults to ${DEFAULT_API_URL}
  --limit <n>              Facts to return in list mode. Default 25, max 100
  --text <text>            Text to parse and store as CRM facts
  --text-file <path>       Local text file to parse and store as CRM facts
  --draft-file <path>      Local JSON draft from fact-intake
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Juana
  --channel <channel>      Channel name, e.g. telegram
  --approved-by <name>     Required with --write
  --write                  Commit facts to the local fact store
  --help                   Show this help

This command is local-only. It never mutates person cards and never sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    limit: 25,
    text: null,
    textFile: null,
    draftFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    approvedBy: null,
    write: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 100) : 25;
    } else if (arg === '--text') {
      options.text = argv[++index];
    } else if (arg === '--text-file') {
      options.textFile = argv[++index];
    } else if (arg === '--draft-file') {
      options.draftFile = argv[++index];
    } else if (arg === '--source-kind') {
      options.sourceKind = argv[++index];
    } else if (arg === '--reporter') {
      options.reporter = argv[++index];
    } else if (arg === '--channel') {
      options.channel = argv[++index];
    } else if (arg === '--approved-by') {
      options.approvedBy = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
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

const readDraft = async (options) => {
  if (!options.draftFile) return null;
  return JSON.parse(await readFile(resolve(options.draftFile), 'utf8'));
};

const listStore = async (options) => {
  const url = new URL(options.apiUrl);
  url.searchParams.set('limit', String(options.limit));
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`fact_store_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`fact_store_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const appendStore = async (options) => {
  const draft = await readDraft(options);
  const text = await readText(options);
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      draft,
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      commit: options.write,
      approvedBy: options.approvedBy,
    }),
  });
  if (!response.ok) throw new Error(`fact_store_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`fact_store_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  if (options.write && !options.approvedBy) {
    throw new Error('approved_by_required_for_write');
  }

  const hasAppendInput = Boolean(options.text || options.textFile || options.draftFile);
  const payload = hasAppendInput ? await appendStore(options) : await listStore(options);

  if (payload.store) {
    console.log(JSON.stringify({
      ok: true,
      mode: payload.store.mode,
      generatedAt: payload.store.generatedAt,
      summary: payload.store.summary,
      facts: payload.store.facts.map((stored) => ({
        storedFactId: stored.storedFactId,
        factId: stored.factId,
        storedAt: stored.storedAt,
        type: stored.fact.type,
        person: stored.fact.person,
        source: stored.fact.source,
        cardApply: stored.cardApply,
      })),
      safety: payload.store.safety,
    }, null, 2));
    return;
  }

  const result = payload.result;
  console.log(JSON.stringify({
    ok: true,
    mode: result.mode,
    committed: result.committed,
    batchId: result.batchId,
    incoming: result.incoming,
    added: result.added.map((stored) => ({
      storedFactId: stored.storedFactId,
      factId: stored.factId,
      type: stored.fact.type,
      person: stored.fact.person,
      cardApply: stored.cardApply,
    })),
    duplicatesSkipped: result.duplicatesSkipped.map((fact) => fact.factId),
    summaryAfter: result.summaryAfter,
    safety: result.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext fact-store failed: ${error.message}`);
  process.exitCode = 1;
});
