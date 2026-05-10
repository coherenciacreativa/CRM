import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  applyCrmVNextCardWritePlanToStore,
  buildCrmVNextCardWriteApply,
} from "../lib/crm/crm-vnext-card-write-apply";
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
