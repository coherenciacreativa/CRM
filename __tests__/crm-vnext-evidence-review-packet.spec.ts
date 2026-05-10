import { describe, expect, test } from "vitest";
import { buildCrmVNextEvidenceReviewPacket } from "../lib/crm/crm-vnext-evidence-review-packet.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mayerliFamilyEvidence = {
  sourceId: "google-drive:retiro-junio:row-7",
  sourceKind: "retreat_table" as const,
  text: [
    "File: RETIRO 25 Y 26 DE JUNIO",
    "Name: Gladys Mayerli Garcia Ortegon",
    "Email: mayaariana@hotmail.com",
    "Phone: 3115381341",
    "Context: Retiro familiar: Ariana Catalina Torres Garcia, Gladys Mayerli Garcia Ortegon y Jose Fidel Torres Delgado comparten correo.",
    "Email ownership review required: email may belong to a family member or companion.",
  ].join(" "),
};

const keepUnassignedDecision = {
  schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10" as const,
  decisionRecordId: "decision-keep-mayaariana",
  decisionBatchId: "batch-test",
  decidedAt: "2026-05-10T12:30:00.000Z",
  approvedBy: "Alejandro",
  sourcePacketGeneratedAt: NOW,
  itemId: "item-test",
  questionId: "question-test",
  questionType: "email_ownership" as const,
  targetPersonId: "ig:mayuyis2626",
  subject: {
    label: "Gladys Mayerli Garcia Ortegon",
    rawName: "Mayerli",
    instagramHandle: "mayuyis2626",
    proposedDisplayName: "Gladys Mayerli Garcia Ortegon",
  },
  candidateEmail: "mayaariana@hotmail.com",
  selectedOptionId: "keep_email_unassigned_family_or_companion" as const,
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
    cardWriteStillRequiresApproval: true as const,
  },
  safety: {
    cardMutationExecuted: false as const,
    factStoreWriteExecuted: false as const,
    outboundExecuted: false as const,
  },
};

describe("CRM vNext evidence review packet", () => {
  test("turns ambiguous family email evidence into explicit review questions", () => {
    const report = buildCrmVNextEvidenceReviewPacket({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [mayerliFamilyEvidence],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    expect(report.mode).toBe("read_only_evidence_review_packet");
    expect(report.summary).toMatchObject({
      reviewItems: 1,
      emailOwnershipQuestions: 1,
      ambiguousEmailCandidates: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });

    const item = report.reviewItems[0];
    expect(item.subject.label).toBe("Gladys Mayerli Garcia Ortegon");
    expect(item.candidateUpdates).toMatchObject({
      displayName: "Gladys Mayerli Garcia Ortegon",
      email: null,
      phone: "3115381341",
      instagramHandle: "mayuyis2626",
    });
    expect(item.ambiguousEmailCandidates[0]).toMatchObject({
      email: "mayaariana@hotmail.com",
      reviewReasons: expect.arrayContaining([
        "family_or_companion_signal",
        "not_assigned_to_subject",
      ]),
    });
    expect(item.possibleRelatedPeople.map((person) => person.name)).toContain("Ariana Catalina Torres Garcia");
    expect(item.decisionQuestions[0]).toMatchObject({
      type: "email_ownership",
      candidateEmail: "mayaariana@hotmail.com",
      recommendedOptionId: "keep_email_unassigned_family_or_companion",
      requiredBefore: ["primary_email_assignment", "card_write", "merge_decision"],
    });
    expect(item.decisionQuestions[0].options.map((option) => option.optionId)).toEqual(expect.arrayContaining([
      "confirm_email_for_subject",
      "keep_email_unassigned_family_or_companion",
      "create_related_person_candidate",
    ]));
    expect(report.safety.cardMutationProhibited).toBe(true);
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("does not re-ask email ownership questions already resolved in the decision ledger", () => {
    const report = buildCrmVNextEvidenceReviewPacket({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [mayerliFamilyEvidence],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
      evidenceReviewDecisions: [keepUnassignedDecision],
    });

    expect(report.summary).toMatchObject({
      reviewItems: 0,
      emailOwnershipQuestions: 0,
      ambiguousEmailCandidates: 0,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(report.preview.previews[0].identityResolution.evidenceDecisionSummary.keptUnassignedEmails).toEqual([
      "mayaariana@hotmail.com",
    ]);
  });

  test("asks for approval before assigning evidence-derived unique emails", () => {
    const report = buildCrmVNextEvidenceReviewPacket({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace más de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "google-drive:seminario-2014:amalia",
          sourceKind: "google_drive_export" as const,
          text: "Name: Amalia De Bedout Email: amaliadbg@hotmail.com Context: yoga, estudiantes, asistentes a retiros.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    expect(report.summary).toMatchObject({
      reviewItems: 1,
      emailOwnershipQuestions: 1,
      ambiguousEmailCandidates: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    const item = report.reviewItems[0];
    expect(item.targetPersonId).toBe("email:amaliadbg@hotmail.com");
    expect(item.candidateUpdates).toMatchObject({
      displayName: "Amalia De Bedout",
      email: "amaliadbg@hotmail.com",
    });
    expect(item.ambiguousEmailCandidates[0]).toMatchObject({
      email: "amaliadbg@hotmail.com",
      reviewReasons: ["evidence_derived_identity_candidate"],
    });
    expect(item.decisionQuestions[0]).toMatchObject({
      candidateEmail: "amaliadbg@hotmail.com",
      recommendedOptionId: "confirm_email_for_subject",
      priority: "high",
    });
  });

  test("marks evidence emails that replace weak candidates for explicit review", () => {
    const report = buildCrmVNextEvidenceReviewPacket({
      text: "CRM: Luis Enrique Lopera entra a clases de yoga y ha asistido a varios retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "email:lazaretas@gmail.com",
          displayName: "Jorge Luis Lazaro",
          identities: {
            email: "lazaretas@gmail.com",
          },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "gmail:luis-enrique-lopera-2023",
          sourceKind: "gmail_export" as const,
          text: "From: Luis Enrique Lopera <luis.e.lopera@gmail.com> Subject: Email from Luis Enrique Lopera",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const item = report.reviewItems[0];
    expect(item.targetPersonId).toBe("email:luis.e.lopera@gmail.com");
    expect(item.ambiguousEmailCandidates[0]).toMatchObject({
      email: "luis.e.lopera@gmail.com",
      reviewReasons: ["weak_candidate_replacement"],
    });
    expect(item.decisionQuestions[0]).toMatchObject({
      candidateEmail: "luis.e.lopera@gmail.com",
      recommendedOptionId: "confirm_email_for_subject",
      priority: "high",
    });
  });

  test("stays empty when there is no ambiguous email ownership to review", () => {
    const report = buildCrmVNextEvidenceReviewPacket({
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0 },
    });

    expect(report.summary.reviewItems).toBe(0);
    expect(report.summary.emailOwnershipQuestions).toBe(0);
    expect(report.reviewItems).toEqual([]);
    expect(report.safety.approvalPacketOnly).toBe(true);
  });
});
