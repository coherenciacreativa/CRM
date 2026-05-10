#!/usr/bin/env node

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/source-ledger';

const usage = `Usage:
  node scripts/crm-vnext-source-ledger.mjs [options]

Options:
  --api-url <url>                         Source ledger API URL. Defaults to ${DEFAULT_API_URL}
  --expected-mailerlite-contacts <number> Known MailerLite contact floor for coverage comparison
  --fail-on-blocked                       Exit with code 2 if blocked gaps exist
  --help                                  Show this help

This script is local-only. It does not read credentials, call external APIs, send messages, or mutate CRM records.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    expectedMailerLiteContacts: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--expected-mailerlite-contacts') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.expectedMailerLiteContacts = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } else if (arg === '--fail-on-blocked') {
      options.failOnBlocked = true;
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const buildApiUrl = (options) => {
  const url = new URL(options.apiUrl);
  if (options.expectedMailerLiteContacts) {
    url.searchParams.set('expectedMailerLiteContacts', String(options.expectedMailerLiteContacts));
  }
  return url;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const headers = {};
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    headers['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }

  const response = await fetch(buildApiUrl(options), { headers });
  if (!response.ok) {
    throw new Error(`source_ledger_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`source_ledger_api_error:${payload.error ?? 'unknown'}`);
  }

  const ledger = payload.ledger;
  const blockedGaps = ledger.gaps.filter((gap) => gap.level === 'blocked');
  console.log(JSON.stringify({
    ok: true,
    generatedAt: ledger.generatedAt,
    status: ledger.status,
    sources: ledger.sources.map((source) => ({
      id: source.id,
      freshness: source.freshness,
      trust: source.trust,
      recordCount: source.recordCount,
      operatorAction: source.operatorAction,
    })),
    gaps: ledger.gaps,
    safety: ledger.safety,
  }, null, 2));

  if (blockedGaps.length && options.failOnBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext source-ledger failed: ${error.message}`);
  process.exitCode = 1;
});
