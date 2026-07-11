const ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION = 'mailerlite_active_trigger_correction_approval_phrase_v1_2026-07-11';
const ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE = 'I approve CRM Core to execute one packet-specific MailerLite active-trigger correction for the explicitly approved existing subscriber only. Add the subscriber to the confirmed active live onboarding trigger group if and only if a fresh packet-specific check confirms that the subscriber exists, is active, is not suppressed, and is not already a member of the active trigger group. Preserve every existing group, including the previously used non-active group. Do not remove groups, do not update subscriber fields or status, do not set resubscribe, do not create fields, do not modify automations or campaigns, do not perform a broad import, do not print raw emails, IDs, group references, subscriber rows, tokens, headers, env values, credentials, raw payloads, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.';

const normalizeApprovalPhrase = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

const approvalTemplatePayload = () => ({
  contract_version: ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  approval_phrase: ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
});

const safeApprovalBlockerExplanation = (reason) => ({
  ok: false,
  status: reason,
  reason,
  safe_explanation: 'The approval phrase must match the canonical active-trigger correction phrase exactly. No live correction can run from a missing, paraphrased, or older phrase.',
});

const validateActiveTriggerCorrectionApprovalPhrase = (phrase) => {
  const normalized = normalizeApprovalPhrase(phrase);
  if (!normalized) return safeApprovalBlockerExplanation('blocked_approval_phrase_missing');
  if (normalized !== ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE) return safeApprovalBlockerExplanation('blocked_approval_phrase_mismatch');
  return {
    ok: true,
    status: 'passed_active_trigger_correction_approval_phrase_contract',
    contract_version: ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  };
};

export {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  approvalTemplatePayload,
  normalizeApprovalPhrase,
  safeApprovalBlockerExplanation,
  validateActiveTriggerCorrectionApprovalPhrase,
};
