#!/usr/bin/env node

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/card-rebuild-diff';

const usage = `Usage:
  node scripts/crm-vnext-card-rebuild-diff.mjs [options]

Options:
  --api-url <url>          Card rebuild diff API URL. Defaults to ${DEFAULT_API_URL}
  --limit <n>              Stored facts to review. Default 50, max 100
  --fail-on-blocked        Exit non-zero when identity/business review or unmatched facts exist
  --help                   Show this help

This command is local read-only. It never mutates person cards and never sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    limit: 50,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 100) : 50;
    } else if (arg === '--fail-on-blocked') {
      options.failOnBlocked = true;
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

const fetchDiff = async (options) => {
  const url = new URL(options.apiUrl);
  url.searchParams.set('limit', String(options.limit));
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`card_rebuild_diff_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`card_rebuild_diff_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactDiff = (diff) => ({
  personId: diff.personId,
  displayName: diff.displayName,
  sourceFactIds: diff.sourceFactIds,
  current: diff.current,
  proposed: {
    evidenceToAdd: diff.proposed.evidenceToAdd.length,
    tagsToAdd: diff.proposed.tagsToAdd,
    productsAfter: diff.proposed.productsAfter,
    operations: diff.proposed.operations.map((operation) => ({
      op: operation.op,
      path: operation.path,
      factIds: operation.factIds,
      delta: operation.delta,
      value: operation.op === 'add_tag' ? operation.value : undefined,
    })),
  },
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await fetchDiff(options);
  const diff = payload.diff;
  console.log(JSON.stringify({
    ok: true,
    mode: diff.mode,
    generatedAt: diff.generatedAt,
    source: payload.source,
    summary: diff.summary,
    diffs: diff.diffs.map(compactDiff),
    blockedItems: diff.blockedItems,
    safety: diff.safety,
  }, null, 2));

  if (options.failOnBlocked && diff.summary.blockedItems > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext card-rebuild-diff failed: ${error.message}`);
  process.exitCode = 1;
});
