import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  applyCrmVNextCardWritePlanToStore,
  buildCrmVNextCardWriteApply,
} from "../lib/crm/crm-vnext-card-write-apply";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";
import type { CrmDeepLocalSource } from "../lib/crm/crm-vnext-deep-local-stitching";
import type { CrmStoredEvidenceReviewDecision } from "../lib/crm/crm-vnext-evidence-review-decisions";

const NOW = "2026-05-10T12:00:00.000Z";
const TEXT = "CRM: @cadavid_eli se llama Eliana Cadavid, asiste a mis clases de yoga y al Encuentro Feliz.";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const leadCaptureEvidence: CrmDeepLocalSource[] = [
  {
    sourceKind: "lead_capture_export",
    sourceId: "manychat-cache:cadavid_eli",
    text: [
      "IG username: cadavid_eli.",
      "Name: Eliana Cadavid.",
      "Email: eli.cadavid@hotmail.com.",
      "Phone: 3104954266.",
      "WhatsApp: +573104954266.",
      "ManyChat contact ID: 1869907027.",
      "IG ID: 1279882713772355.",
      "Context: Se unio a clases de yoga y recibe grabaciones por WhatsApp.",
    ].join(" "),
  },
];

const baseInput = {
  text: TEXT,
  sourceKind: "alejandro_conversation" as const,
  reporter: "Alejandro",
  channel: "codex",
  now: NOW,
  cards: [],
  mailerBridgeRows: [],
  localSources: leadCaptureEvidence,
  sourceCoverage: {
    roots: 0,
    filesScanned: 0,
    filesSkipped: 0,
    sourcesLoaded: leadCaptureEvidence.length,
    connectedEvidenceSources: leadCaptureEvidence.length,
  },
};

const confirmedEmailDecision = async (): Promise<CrmStoredEvidenceReviewDecision[]> => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-write-apply-"));
  dirs.push(dir);
  return [
    {
      schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10",
      decisionRecordId: "evidence_decision_eliana_email_confirmed",
      decisionBatchId: "evidence_decision_batch_test",
      decidedAt: NOW,
      approvedBy: "Alejandro",
      sourcePacketGeneratedAt: NOW,
      itemId: "evidence_review_eliana",
      questionId: "evidence_question_eliana_email",
      questionType: "email_ownership",
      targetPersonId: null,
      subject: {
        label: "Eliana Cadavid",
        rawName: "Eliana Cadavid",
        instagramHandle: "cadavid_eli",
        proposedDisplayName: "Eliana Cadavid",
      },
      candidateEmail: "eli.cadavid@hotmail.com",
      selectedOptionId: "confirm_email_for_subject",
      selectedOptionLabel: "Confirm eli.cadavid@hotmail.com as Eliana Cadavid's email",
      notes: null,
      relatedPersonName: null,
      evidenceSourceIds: ["manychat-cache:cadavid_eli"],
      effect: {
        primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: true,
        keepEmailUnassigned: false,
        createsRelatedPersonCandidate: false,
        needsMoreEvidence: false,
        ignoredCandidate: false,
        cardWriteStillRequiresApproval: true,
      },
      safety: {
        cardMutationExecuted: false,
        factStoreWriteExecuted: false,
        outboundExecuted: false,
      },
    },
  ];
};

describe("buildCrmVNextCardWriteApply", () => {
  test("plans an approved local card upsert without committing by default", async () => {
    const evidenceReviewDecisions = await confirmedEmailDecision();
    const report = buildCrmVNextCardWriteApply({
      ...baseInput,
      evidenceReviewDecisions,
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: false,
    });

    expect(report.mode).toBe("dry_run_card_write_apply");
    expect(report.summary).toMatchObject({
      readyApprovalItems: 1,
      selectedItems: 1,
      commitEligibleItems: 1,
      cardsToUpsert: 1,
      operationsExecuted: 0,
      committed: false,
      commitBlocked: false,
    });
    expect(report.planItems[0]).toMatchObject({
      status: "ready_to_commit",
      targetPersonId: "ig:cadavid_eli",
      mutationKind: "upsert_vnext_card",
    });
    expect(report.planItems[0].proposedCard?.identities).toMatchObject({
      email: "eli.cadavid@hotmail.com",
      instagramHandle: "cadavid_eli",
      phone: "3104954266",
    });
  });

  test("blocks committed writes without approvedBy and explicit selection", async () => {
    const evidenceReviewDecisions = await confirmedEmailDecision();
    const report = buildCrmVNextCardWriteApply({
      ...baseInput,
      evidenceReviewDecisions,
      commit: true,
    });

    expect(report.summary.committed).toBe(false);
    expect(report.summary.commitBlocked).toBe(true);
    expect(report.summary.commitBlockers).toEqual(expect.arrayContaining([
      "approved_by_required_for_commit",
      "explicit_approval_item_selection_or_apply_all_ready_required_for_commit",
    ]));
  });

  test("enriches an existing sparse card with confirmed identity evidence", async () => {
    const evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [{
      schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10",
      decisionRecordId: "evidence_decision_gulnara_email_confirmed",
      decisionBatchId: "evidence_decision_batch_test",
      decidedAt: NOW,
      approvedBy: "Alejandro",
      sourcePacketGeneratedAt: NOW,
      itemId: "evidence_review_gulnara",
      questionId: "evidence_question_gulnara_email",
      questionType: "email_ownership",
      targetPersonId: "ig:gulnarapaola",
      subject: {
        label: "Gulnara Paola Castaño Reyes",
        rawName: "Gulnara Paola Castaño Reyes",
        instagramHandle: "gulnarapaola",
        proposedDisplayName: null,
      },
      candidateEmail: "gulnacast@gmail.com",
      selectedOptionId: "confirm_email_for_subject",
      selectedOptionLabel: "Confirm gulnacast@gmail.com as Gulnara Paola Castaño Reyes's email",
      notes: null,
      relatedPersonName: null,
      evidenceSourceIds: ["mantis_evidence:gulnarapaola:mailerlite_export:2"],
      effect: {
        primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: true,
        keepEmailUnassigned: false,
        createsRelatedPersonCandidate: false,
        needsMoreEvidence: false,
        ignoredCandidate: false,
        cardWriteStillRequiresApproval: true,
      },
      safety: {
        cardMutationExecuted: false,
        factStoreWriteExecuted: false,
        outboundExecuted: false,
      },
    }];
    const existingCard = buildPersonCardVNext({
      personId: "ig:gulnarapaola",
      now: NOW,
      identities: {
        instagramHandle: "gulnarapaola",
      },
      evidence: [],
    });
    const evidenceSources: CrmDeepLocalSource[] = [
      {
        sourceKind: "lead_capture_export",
        sourceId: "mantis_evidence:gulnarapaola:lead_capture_export:1",
        text: "Handle: @gulnarapaola\nConfidence: high\nFinding: Conversación activa; inbound explícito.",
      },
      {
        sourceKind: "mailerlite_export",
        sourceId: "mantis_evidence:gulnarapaola:mailerlite_export:2",
        text: [
          "Handle: @gulnarapaola",
          "Name: Gulnara Paola Castaño Reyes",
          "Email: gulnacast@gmail.com",
          "Phone: +57 300 4477735",
          "Groups: Asistentes a retiro Junio 2024",
        ].join("\n"),
      },
      {
        sourceKind: "retreat_table",
        sourceId: "mantis_evidence:gulnarapaola:retreat_table:3",
        text: "Gulnara Paola Castaño Reyes, gulnacast@gmail.com, +57 300 4477735, approved.",
      },
    ];

    const report = buildCrmVNextCardWriteApply({
      text: "CRM: @gulnarapaola se llama Gulnara Paola Castaño Reyes, y preguntó o manifestó interés por el retiro.",
      sourceKind: "instagram_signal",
      reporter: "Mantis",
      channel: "codex",
      now: NOW,
      cards: [existingCard],
      mailerBridgeRows: [],
      localSources: evidenceSources,
      sourceCoverage: {
        roots: 0,
        filesScanned: 0,
        filesSkipped: 0,
        sourcesLoaded: evidenceSources.length,
        connectedEvidenceSources: evidenceSources.length,
      },
      evidenceReviewDecisions,
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: false,
    });

    expect(report.planItems[0]).toMatchObject({
      status: "ready_to_commit",
      recommendedAction: "enrich_existing_card",
    });
    expect(report.planItems[0].proposedCard?.displayName).toBe("Gulnara Paola Castaño Reyes");
    expect(report.planItems[0].proposedCard?.identities).toMatchObject({
      email: "gulnacast@gmail.com",
      instagramHandle: "gulnarapaola",
      phone: "+573004477735",
    });
  });

  test("uses the approved subject name when enriching an existing card with no display name", () => {
    const evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [{
      schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10",
      decisionRecordId: "evidence_decision_cielo_email_confirmed",
      decisionBatchId: "evidence_decision_batch_test",
      decidedAt: NOW,
      approvedBy: "Alejandro",
      sourcePacketGeneratedAt: NOW,
      itemId: "evidence_review_cielo",
      questionId: "evidence_question_cielo_email",
      questionType: "email_ownership",
      targetPersonId: "ig:cielo_gom_g",
      subject: {
        label: "Cielo Gomez",
        rawName: "Cielo Gomez",
        instagramHandle: "cielo_gom_g",
        proposedDisplayName: null,
      },
      candidateEmail: "cielotago@gmail.com",
      selectedOptionId: "confirm_email_for_subject",
      selectedOptionLabel: "Confirm cielotago@gmail.com as Cielo Gomez's email",
      notes: null,
      relatedPersonName: null,
      evidenceSourceIds: ["mantis_evidence:cielo_gom_g:mailerlite_export:4"],
      effect: {
        primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: true,
        keepEmailUnassigned: false,
        createsRelatedPersonCandidate: false,
        needsMoreEvidence: false,
        ignoredCandidate: false,
        cardWriteStillRequiresApproval: true,
      },
      safety: {
        cardMutationExecuted: false,
        factStoreWriteExecuted: false,
        outboundExecuted: false,
      },
    }];
    const existingCard = buildPersonCardVNext({
      personId: "ig:cielo_gom_g",
      now: NOW,
      identities: {
        instagramHandle: "cielo_gom_g",
      },
      evidence: [],
    });
    const evidenceSources: CrmDeepLocalSource[] = [{
      sourceKind: "mailerlite_export",
      sourceId: "mantis_evidence:cielo_gom_g:mailerlite_export:4",
      text: [
        "Handle: @cielo_gom_g",
        "Name: Cielo Gom G",
        "Finding: Identity bridge review required. Active subscriber Cielo Gomez: cielotago@gmail.com, +573143011712, Bogota/Colombia.",
      ].join("\n"),
    }];

    const report = buildCrmVNextCardWriteApply({
      text: "CRM: @cielo_gom_g es Cielo Gomez.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [existingCard],
      mailerBridgeRows: [],
      localSources: evidenceSources,
      sourceCoverage: {
        roots: 0,
        filesScanned: 0,
        filesSkipped: 0,
        sourcesLoaded: evidenceSources.length,
        connectedEvidenceSources: evidenceSources.length,
      },
      evidenceReviewDecisions,
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: false,
    });

    expect(report.planItems[0]).toMatchObject({
      status: "ready_to_commit",
      targetPersonId: "ig:cielo_gom_g",
      recommendedAction: "enrich_existing_card",
    });
    expect(report.planItems[0].proposedCard?.displayName).toBe("Cielo Gomez");
    expect(report.planItems[0].proposedCard?.identities).toMatchObject({
      email: "cielotago@gmail.com",
      instagramHandle: "cielo_gom_g",
      phone: "+573143011712",
    });
  });

  test("keeps approval item ids stable across repeated previews of the same input", async () => {
    const evidenceReviewDecisions = await confirmedEmailDecision();
    const first = buildCrmVNextCardWriteApply({
      ...baseInput,
      evidenceReviewDecisions,
      now: "2026-05-10T12:00:00.000Z",
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: false,
    });
    const second = buildCrmVNextCardWriteApply({
      ...baseInput,
      evidenceReviewDecisions,
      now: "2026-05-10T12:05:00.000Z",
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: false,
    });

    expect(first.planItems[0].approvalItemId).toBe(second.planItems[0].approvalItemId);
    expect(first.planItems[0].applyItemId).toBe(second.planItems[0].applyItemId);
  });
});

describe("applyCrmVNextCardWritePlanToStore", () => {
  test("applies eligible plan items to a local vNext card store with provenance", async () => {
    const evidenceReviewDecisions = await confirmedEmailDecision();
    const report = buildCrmVNextCardWriteApply({
      ...baseInput,
      evidenceReviewDecisions,
      applyAllReady: true,
      approvedBy: "Alejandro",
      commit: true,
    });
    expect(report.summary.committed).toBe(true);

    const applied = applyCrmVNextCardWritePlanToStore({
      report,
      baseCards: [],
      approvedBy: "Alejandro",
      committedAt: NOW,
    });

    expect(applied.store.cards).toHaveLength(1);
    expect(applied.store.cards[0]).toMatchObject({
      personId: "ig:cadavid_eli",
      displayName: "Eliana Cadavid",
    });
    expect(applied.store.provenance).toHaveLength(1);
    expect(applied.store.provenance[0]).toMatchObject({
      approvedBy: "Alejandro",
      mutationKind: "upsert_vnext_card",
      safety: {
        outboundExecuted: false,
        factStoreWriteExecuted: false,
        liveApiCallsExecuted: false,
        credentialReadExecuted: false,
      },
    });
    expect(applied.ledgerEntries).toHaveLength(1);
    expect(applied.ledgerEntries[0]).toMatchObject({
      committedBy: "Alejandro",
      mutationKind: "upsert_vnext_card",
      cardPersonId: "ig:cadavid_eli",
    });
  });
});
