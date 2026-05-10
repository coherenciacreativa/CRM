import { describe, expect, test } from "vitest";
import { buildCrmVNextStitchBatchReview } from "../lib/crm/crm-vnext-stitch-batch-review.js";
import { parseMailerBridgeCandidatesCsv } from "../lib/crm/crm-vnext-identity-stitching-research.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mailerCsv = [
  "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
  "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Consejeros;Asistentes a retiros;Aliados importantes;Amigos de la Fundación;Medellín,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
].join("\n");

const mayerliEvidence = [
  {
    sourceId: "google-drive:retiros-2023:row-12",
    sourceKind: "retreat_table" as const,
    text: [
      "File: Retiros 2023",
      "Name: Mayerli Garcia",
      "Email: mayariana@hotmail.com",
      "Phone: 3115381341",
      "Context: Retiro familiar; Alejandro recuerda que el correo puede ser de Ariana.",
      "Email ownership review required: email may belong to a family member or companion.",
    ].join(" "),
  },
  {
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
  },
];

const keepMayaarianaDecision = {
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

describe("CRM vNext stitch batch review", () => {
  test("summarizes multi-contact stitching with stored evidence decisions applied", () => {
    const report = buildCrmVNextStitchBatchReview({
      text: [
        "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología.",
        "@mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      ].join(" "),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv(mailerCsv),
      localSources: mayerliEvidence,
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 2 },
      evidenceReviewDecisions: [keepMayaarianaDecision],
    });

    expect(report.mode).toBe("read_only_stitch_batch_review");
    expect(report.summary).toMatchObject({
      items: 2,
      reviewNeeded: 2,
      openEvidenceQuestions: 1,
      appliedEvidenceDecisions: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });

    const juan = report.items.find((item) => item.targetPersonId === "email:juanjotru@gmail.com");
    expect(juan).toMatchObject({
      recommendedAction: "review_merge_or_create",
      stage: "review_needed",
      identity: { email: "juanjotru@gmail.com", instagramHandle: null },
    });
    expect(juan?.openQuestions).toEqual([]);

    const mayerli = report.items.find((item) => item.targetPersonId === "ig:mayuyis2626");
    expect(mayerli).toMatchObject({
      recommendedAction: "review_deferred_write",
      stage: "review_needed",
      identity: {
        email: null,
        phone: "3115381341",
        evidenceDecisionSummary: {
          keptUnassignedEmails: ["mayaariana@hotmail.com"],
          appliedDecisionRecordIds: ["decision-keep-mayaariana"],
        },
      },
    });
    expect(mayerli?.openQuestions.map((question) => question.candidateEmail)).toEqual([
      "mayariana@hotmail.com",
    ]);
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("marks existing-card enrichment as approval-ready without applying it", () => {
    const report = buildCrmVNextStitchBatchReview({
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "ig:ana_yoga",
          displayName: "Ana Yoga",
          identities: { instagramHandle: "ana_yoga" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
      localSources: [],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0 },
    });

    expect(report.summary).toMatchObject({
      items: 1,
      approvalReady: 1,
      operationsExecuted: 0,
    });
    expect(report.items[0]).toMatchObject({
      recommendedAction: "enrich_existing_card",
      stage: "approval_ready",
      targetPersonId: "ig:ana_yoga",
      safeNextStep: "Ready for a separate human card-write approval, still not auto-applied.",
    });
  });
});
