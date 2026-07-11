const ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION = 'mailerlite_active_trigger_correction_approval_phrase_v1_2026-07-11';
const ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE = 'I approve CRM Core to execute one packet-specific MailerLite active-trigger correction for the explicitly approved existing subscriber only. Add the subscriber to the confirmed active live onboarding trigger group if and only if a fresh packet-specific check confirms that the subscriber exists, is active, is not suppressed, and is not already a member of the active trigger group. Preserve every existing group, including the previously used non-active group. Do not remove groups, do not update subscriber fields or status, do not set resubscribe, do not create fields, do not modify automations or campaigns, do not perform a broad import, do not print raw emails, IDs, group references, subscriber rows, tokens, headers, env values, credentials, raw payloads, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.';
const MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION = 'Mission Contract 2026-07-11.v1';
const MISSION_CONTRACT_APPROVAL_PHRASE = `Apruebo el Mission Contract 2026-07-11.v1 exactamente como está escrito.

Autorizo su ejecución end-to-end en Proof Mode, incluyendo las lecturas live y privadas limitadas al único contacto controlado, grupo trigger activo, automatización exacta de onboarding y buzón controlado.

Si el grupo ya está presente, debe hacerse no-op. Si y solo si está ausente, autorizo una única asignación add-only y, como consecuencia, como máximo un primer correo automático de onboarding al mismo destinatario controlado.

Autorizo la verificación inmediata, evidencia limitada de entrega, recibo redactado, revisión adversarial independiente, una única integración central y un closeout final.

No reutilizo la aprobación anterior. Aplican todos los budgets, requisitos de atomicidad y freshness, stop rules y forbidden scope del contrato. No autorizo ninguna ampliación de persona, fuente, destinatario, grupo, automatización o efecto.`;

const APPROVAL_CONTRACTS = Object.freeze({
  [ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION]: ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  [MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION]: MISSION_CONTRACT_APPROVAL_PHRASE,
});

const normalizeApprovalPhrase = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

const approvalTemplatePayload = (contractVersion = ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION) => {
  const approvalPhrase = APPROVAL_CONTRACTS[contractVersion];
  if (!approvalPhrase) throw new Error('blocked_approval_contract_version_unknown');
  return {
    contract_version: contractVersion,
    approval_phrase: approvalPhrase,
  };
};

const safeApprovalBlockerExplanation = (reason) => ({
  ok: false,
  status: reason,
  reason,
  safe_explanation: 'The approval phrase and explicitly selected contract version must match one registered contract exactly. No fallback, paraphrase, cross-version match, or older approval can authorize a live correction.',
});

const validateActiveTriggerCorrectionApprovalPhrase = (phrase, contractVersion) => {
  if (!normalizeApprovalPhrase(contractVersion)) return safeApprovalBlockerExplanation('blocked_approval_contract_version_missing');
  const expectedPhrase = APPROVAL_CONTRACTS[contractVersion];
  if (!expectedPhrase) return safeApprovalBlockerExplanation('blocked_approval_contract_version_unknown');
  const normalized = normalizeApprovalPhrase(phrase);
  if (!normalized) return safeApprovalBlockerExplanation('blocked_approval_phrase_missing');
  if (normalized !== normalizeApprovalPhrase(expectedPhrase)) return safeApprovalBlockerExplanation('blocked_approval_phrase_mismatch');
  return {
    ok: true,
    status: 'passed_active_trigger_correction_approval_phrase_contract',
    contract_version: contractVersion,
  };
};

export {
  APPROVAL_CONTRACTS,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  MISSION_CONTRACT_APPROVAL_PHRASE,
  approvalTemplatePayload,
  normalizeApprovalPhrase,
  safeApprovalBlockerExplanation,
  validateActiveTriggerCorrectionApprovalPhrase,
};
