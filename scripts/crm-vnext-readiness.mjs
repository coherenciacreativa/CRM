#!/usr/bin/env node

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/readiness';

const usage = `Usage:
  node scripts/crm-vnext-readiness.mjs [options]

Options:
  --api-url <url>       Readiness API URL. Defaults to ${DEFAULT_API_URL}
  --fail-on-blocked    Exit with code 2 when readiness.status is blocked
  --fail-on-watch      Exit with code 2 when readiness.status is watch or blocked
  --help               Show this help

This script is local-only. It does not send Telegram, Instagram, email, WhatsApp, ManyChat, or any other outbound message.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    failOnBlocked: false,
    failOnWatch: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--fail-on-blocked') {
      options.failOnBlocked = true;
    } else if (arg === '--fail-on-watch') {
      options.failOnWatch = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const nextActionFor = (status) => {
  if (status === 'blocked') {
    return 'Repair the local person-cards source before running CRM vNext operator jobs.';
  }
  if (status === 'watch') {
    return 'Operator jobs may run, but Mantis should inspect watch checks before planning follow-up.';
  }
  return 'Operator jobs may run locally under the existing read-only guardrails.';
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

  const response = await fetch(options.apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`readiness_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`readiness_api_error:${payload.error ?? 'unknown'}`);
  }

  const readiness = payload.readiness;
  console.log(JSON.stringify({
    ok: true,
    generatedAt: readiness.generatedAt,
    status: readiness.status,
    cards: readiness.totals.cards,
    identities: {
      emailPresent: readiness.totals.emailPresent,
      instagramPresent: readiness.totals.instagramPresent,
      omnichannel: readiness.totals.omnichannel,
    },
    queues: readiness.queues.totals,
    checks: readiness.checks.map((check) => ({
      id: check.id,
      level: check.level,
      operatorAction: check.operatorAction,
    })),
    safety: readiness.safety,
    nextAction: nextActionFor(readiness.status),
  }, null, 2));

  if (readiness.status === 'blocked' && options.failOnBlocked) {
    process.exitCode = 2;
  }
  if ((readiness.status === 'blocked' || readiness.status === 'watch') && options.failOnWatch) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext readiness failed: ${error.message}`);
  process.exitCode = 1;
});
