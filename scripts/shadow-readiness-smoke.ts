import { buildCanonicalIngestionEventV1 } from '../lib/manychat/ingestion-contract-v1.js';
import { buildWebhookIdentityClaims, resolveWebhookIdentity } from '../lib/manychat/webhook-identity.js';

type CheckResult = {
  name: string;
  pass: boolean;
  detail: string;
};

const checks: CheckResult[] = [];

const run = async () => {
  const toCrmCopy2Payload = {
    source: 'instagram',
    channel: 'instagram',
    flow_id: 'content20250930140219_013526',
    flow_name: 'To CRM copy 2',
    trigger_type: 'keyword_dm',
    event: 'message_received',
    contact_id: '563924665',
    timestamp: 1_772_341_600,
    last_text_input: 'Hola, mi correo es persona@example.com',
    message_id: 'msg-01',
    flow_status: 'LIVE',
  };

  const first = buildCanonicalIngestionEventV1(toCrmCopy2Payload);
  const second = buildCanonicalIngestionEventV1(toCrmCopy2Payload);

  checks.push({
    name: 'Contract required fields present (To CRM copy 2 sample)',
    pass: first.requiredMissing.length === 0,
    detail: first.requiredMissing.length ? `Missing: ${first.requiredMissing.join(', ')}` : 'All required fields present',
  });

  checks.push({
    name: 'Contract flow binding is correct',
    pass:
      first.contract.flow_id === 'content20250930140219_013526' &&
      first.contract.flow_name === 'To CRM copy 2',
    detail: `flow_id=${first.contract.flow_id}, flow_name=${first.contract.flow_name}`,
  });

  checks.push({
    name: 'Contract dedupe key is deterministic',
    pass: first.contract.dedupe_key === second.contract.dedupe_key,
    detail: `dedupe_key=${first.contract.dedupe_key}`,
  });

  const matchedIdentityInput = buildWebhookIdentityClaims({
    email: 'priority@example.com',
    phone: '+57 320 111 2233',
  });

  const matchedIdentity = await resolveWebhookIdentity(matchedIdentityInput as Record<string, unknown>, {
    fetchMatches: async (reason, value) => {
      if (reason === 'email' && value === 'priority@example.com') return [{ id: 'contact-priority' }];
      if (reason === 'phone' && value === '+573201112233') return [{ id: 'contact-priority' }];
      return [];
    },
  });

  checks.push({
    name: 'Identity resolver matches trusted identifier path',
    pass:
      matchedIdentity.status === 'matched' &&
      matchedIdentity.matchReason === 'email' &&
      matchedIdentity.contact?.id === 'contact-priority',
    detail: `status=${matchedIdentity.status}, matchReason=${matchedIdentity.matchReason}`,
  });

  const conflictIdentityInput = buildWebhookIdentityClaims({
    email: 'person@example.com',
    manychat_contact_id: 'mc-10',
  });

  const conflictIdentity = await resolveWebhookIdentity(conflictIdentityInput as Record<string, unknown>, {
    fetchMatches: async (reason) => {
      if (reason === 'email') return [{ id: 'contact-email' }];
      if (reason === 'manychat_contact_id') return [{ id: 'contact-manychat' }];
      return [];
    },
  });

  checks.push({
    name: 'Identity resolver guards unsafe merge on conflict',
    pass: conflictIdentity.status === 'conflict' && conflictIdentity.contact === null,
    detail: `status=${conflictIdentity.status}, conflicts=${JSON.stringify(conflictIdentity.conflictReasons ?? [])}`,
  });

  const failed = checks.filter((check) => !check.pass);
  const passedCount = checks.length - failed.length;

  console.log('Shadow readiness smoke (local, non-destructive)');
  console.log(`Checks: ${passedCount}/${checks.length} passed`);
  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} - ${check.name}`);
    console.log(`  ${check.detail}`);
  }

  if (failed.length) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
};

run().catch((error) => {
  console.error('Shadow readiness smoke failed with exception');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
