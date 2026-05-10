#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/fact-intake';

const usage = `Usage:
  node scripts/crm-vnext-fact-intake.mjs [options]

Options:
  --api-url <url>          Fact intake API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            Text to parse into CRM facts
  --text-file <path>       Local text file to parse
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Juana
  --channel <channel>      Channel name, e.g. telegram
  --help                   Show this help

This script is dry-run only. It does not send messages or mutate CRM records.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--text') {
      options.text = argv[++index];
    } else if (arg === '--text-file') {
      options.textFile = argv[++index];
    } else if (arg === '--source-kind') {
      options.sourceKind = argv[++index];
    } else if (arg === '--reporter') {
      options.reporter = argv[++index];
    } else if (arg === '--channel') {
      options.channel = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  throw new Error('missing_text');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const headers = { 'content-type': 'application/json' };
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    headers['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: await readText(options),
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
    }),
  });

  if (!response.ok) {
    throw new Error(`fact_intake_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`fact_intake_api_error:${payload.error ?? 'unknown'}`);
  }

  const draft = payload.draft;
  console.log(JSON.stringify({
    ok: true,
    generatedAt: draft.generatedAt,
    mode: draft.mode,
    summary: draft.summary,
    facts: draft.facts.map((fact) => ({
      id: fact.factId,
      type: fact.type,
      person: fact.person,
      subject: fact.subject,
      confidence: fact.confidence,
      requiresHumanReview: fact.requiresHumanReview,
      tags: fact.suggestedCardPatch.tags,
    })),
    ambiguities: draft.ambiguities,
    safety: draft.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext fact-intake failed: ${error.message}`);
  process.exitCode = 1;
});
