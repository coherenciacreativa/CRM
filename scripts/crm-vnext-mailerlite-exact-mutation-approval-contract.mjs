const EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION = 'mailerlite_exact_mutation_approval_phrase_v1_2026-07-09';

const EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE = "I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved group-reference-repaired private onboarding packet only, using the implemented exact mutation execution guard, the fresh final-check receipt that satisfies `mailerlite_final_check_ready_receipt_v1`, and the successful preflight-only validation. Use the approved operation class `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`, the approved native top-level email semantics, the approved existing field mapping, and the confirmed onboarding group. Immediately before mutation, validate the packet-specific idempotency and suppression safety gate from the fresh final-check receipt. Do not create fields, do not modify automations or campaigns, do not create or modify segments, forms, webhooks, or account settings, do not perform a broad import, do not print raw emails, IDs, group references, subscriber rows, tokens, headers, env values, credentials, raw payloads, private message text, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.";

const normalizeApprovalPhraseForComparison = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
};

const validateExactOnboardingMutationApprovalPhrase = (value) => {
  const normalized = normalizeApprovalPhraseForComparison(value);
  if (!normalized) {
    return {
      ok: false,
      status: 'blocked_missing_approval_phrase',
      reason: 'not_run_missing_approval',
      contract_version: EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
    };
  }
  if (normalized !== EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE) {
    return {
      ok: false,
      status: 'blocked_approval_phrase_contract_mismatch',
      reason: 'not_run_approval_phrase_contract_mismatch',
      contract_version: EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
    };
  }
  return {
    ok: true,
    status: 'passed_exact_approval_phrase_contract',
    reason: null,
    contract_version: EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  };
};

const explainExactOnboardingMutationApprovalBlockers = (value) => {
  const validation = validateExactOnboardingMutationApprovalPhrase(value);
  return validation.ok ? [] : [validation.reason];
};

const approvalTemplatePayload = () => ({
  contract_version: EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  approval_phrase: EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
});

export {
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
  approvalTemplatePayload,
  explainExactOnboardingMutationApprovalBlockers,
  normalizeApprovalPhraseForComparison,
  validateExactOnboardingMutationApprovalPhrase,
};
