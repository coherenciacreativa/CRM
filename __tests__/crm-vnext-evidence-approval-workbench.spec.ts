import { describe, expect, test } from "vitest";
import { buildCrmVNextEvidenceApprovalWorkbench } from "../lib/crm/crm-vnext-evidence-approval-workbench.js";
import {
  CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION,
  type CrmStoredEvidenceReviewDecision,
} from "../lib/crm/crm-vnext-evidence-review-decisions.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mayerliInput = {
  text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
  sourceKind: "alejandro_conversation" as const,
  reporter: "Alejandro",
  channel: "codex",
  now: NOW,
  cards: [],
  mailerBridgeRows: [],
  localSources: [
    {
      sourceId: "google-drive:retiro-junio:row-7",
      sourceKind: "retreat_table" as const,
      text: [
        "File: RETIRO 25 Y 26 DE JUNIO",
        "Name: Gladys Mayerli Garcia Ortegon",
        "Email: mayaariana@hotmail.com",
        "Phone: 3115381341",
        "Context: Retiro familiar: Ariana Catalina Torres Garcia comparte correo.",
        "Email ownership review required: email may belong to a family member or companion.",
      ].join(" "),
    },
  ],
  sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
};

const keptDecision: CrmStoredEvidenceReviewDecision = {
  schemaVersion: CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION,
  decisionRecordId: "decision_mayerli_family_email",
  decisionBatchId: "batch",
  decidedAt: NOW,
  approvedBy: "Alejandro",
  sourcePacketGeneratedAt: NOW,
  itemId: "item",
  questionId: "question",
  questionType: "email_ownership",
  targetPersonId: "ig:mayuyis2626",
  subject: {
    label: "Gladys Mayerli Garcia Ortegon",
    rawName: "Mayerli",
    instagramHandle: "mayuyis2626",
    proposedDisplayName: "Gladys Mayerli Garcia Ortegon",
  },
  candidateEmail: "mayaariana@hotmail.com",
  selectedOptionId: "keep_email_unassigned_family_or_companion",
  selectedOptionLabel: "Keep email unassigned as family/companion evidence",
  notes: null,
  relatedPersonName: null,
  evidenceSourceIds: ["google-drive:retiro-junio:row-7"],
  effect: {
    primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: false,
    keepEmailUnassigned: true,
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
};

describe("CRM vNext evidence approval workbench", () => {
  test("builds a compact decision queue with recommended defaults", () => {
    const workbench = buildCrmVNextEvidenceApprovalWorkbench(mayerliInput);

    expect(workbench.summary).toMatchObject({
      reviewItems: 1,
      queueItems: 1,
      highPriority: 1,
      recommendedKeepUnassigned: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(workbench.queueItems[0]).toMatchObject({
      priority: "high",
      candidateEmail: "mayaariana@hotmail.com",
      recommendedOptionId: "keep_email_unassigned_family_or_companion",
      recommendedDecisionCli: "--select-email mayaariana@hotmail.com=keep_email_unassigned_family_or_companion",
      blocks: {
        primaryEmailAssignment: true,
        cardWrite: true,
        mergeDecision: true,
      },
    });
    expect(workbench.queueItems[0].evidence.reviewReasons).toContain("family_or_companion_signal");
    expect(workbench.safety).toMatchObject({
      readOnly: true,
      cardMutationProhibited: true,
      workbenchOnly: true,
    });
    expect(JSON.stringify(workbench)).not.toContain("/Users/");
  });

  test("suppresses already decided evidence questions", () => {
    const workbench = buildCrmVNextEvidenceApprovalWorkbench({
      ...mayerliInput,
      evidenceReviewDecisions: [keptDecision],
    });

    expect(workbench.summary.queueItems).toBe(0);
    expect(workbench.summary.blockedOpenEvidenceQuestions).toBe(0);
  });

  test("does not assign a structured contact row to a contextual family mention", () => {
    const workbench = buildCrmVNextEvidenceApprovalWorkbench({
      text: "CRM: Amalia de Bedud es estudiante de yoga y ha asistido a retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "contacts:natalia:1",
          sourceKind: "contacts_app_export",
          text: "Name: Natalia Cardenas De Bedout Email: natis1000@hotmail.com Context: daughter of Amalia and yoga retreats",
        },
        {
          sourceId: "gmail:amalia:1",
          sourceKind: "gmail_export",
          text: "From: Amalia De Bedout <amaliadbg@hotmail.com> Subject: Yoga y retiros",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 2 },
    });

    expect(workbench.queueItems.map((item) => item.candidateEmail)).toContain("amaliadbg@hotmail.com");
    expect(workbench.queueItems.map((item) => item.candidateEmail)).not.toContain("natis1000@hotmail.com");
  });
});
