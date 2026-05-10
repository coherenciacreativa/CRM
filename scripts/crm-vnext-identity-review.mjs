#!/usr/bin/env node

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/identity-review';

const usage = `Usage:
  node scripts/crm-vnext-identity-review.mjs [options]

Options:
  --api-url <url>          Identity review API URL. Defaults to ${DEFAULT_API_URL}
  --limit <n>              Stored facts to review. Default 50, max 100
  --fail-on-review         Exit non-zero when identity/business review or unmatched facts exist
  --help                   Show this help

This command is local read-only. It never mutates person cards and never sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    limit: 50,
    failOnReview: false,
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
    } else if (arg === '--fail-on-review') {
      options.failOnReview = true;
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

const fetchReview = async (options) => {
  const url = new URL(options.apiUrl);
  url.searchParams.set('limit', String(options.limit));
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`identity_review_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`identity_review_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactItem = (item) => ({
  storedFactId: item.storedFactId,
  factId: item.factId,
  status: item.status,
  reason: item.reason,
  type: item.fact.type,
  person: item.fact.person,
  candidateCount: item.candidates.length,
  candidates: item.candidates.map((candidate) => ({
    personId: candidate.personId,
    displayName: candidate.displayName,
    confidence: candidate.confidence,
    matchReasons: candidate.matchReasons,
  })),
  preview: item.preview
    ? {
        personId: item.preview.personId,
        currentCard: item.preview.currentCard,
        proposedTags: item.preview.proposedTags,
        scoringHints: item.preview.scoringHints,
      }
    : null,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await fetchReview(options);
  const review = payload.review;
  console.log(JSON.stringify({
    ok: true,
    mode: review.mode,
    generatedAt: review.generatedAt,
    source: payload.source,
    summary: review.summary,
    items: review.items.map(compactItem),
    safety: review.safety,
  }, null, 2));

  const blockingCount =
    review.summary.needsIdentityReview
    + review.summary.needsBusinessReview
    + review.summary.unmatched;
  if (options.failOnReview && blockingCount > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext identity-review failed: ${error.message}`);
  process.exitCode = 1;
});
