import { describe, expect, test } from "vitest";
import { buildCrmVNextCardWriteApprovalPacket } from "../lib/crm/crm-vnext-card-write-approval-packet.js";
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

describe("CRM vNext card write approval packet", () => {
  test("separates ready approval items from evidence-blocked items", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
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

    expect(report.mode).toBe("read_only_card_write_approval_packet");
    expect(report.summary).toMatchObject({
      items: 2,
      readyForHumanApproval: 1,
      blockedOpenEvidenceQuestions: 1,
      blockedNeedsMoreIdentity: 0,
      openEvidenceQuestions: 1,
      restrictedServiceApprovalItems: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });

    const juan = report.approvalItems.find((item) => item.targetPersonId === "email:juanjotru@gmail.com");
    expect(juan).toMatchObject({
      status: "ready_for_human_approval",
      recommendedAction: "review_merge_or_create",
      approvalScopes: expect.arrayContaining([
        "card_write_policy",
        "identity_match",
        "merge_policy",
        "privacy_restricted_service",
        "no_outbound_confirmation",
      ]),
      operationsExecuted: 0,
    });
    expect(juan?.openQuestions).toEqual([]);
    expect(juan?.requestedDecision.approveOptionId).toBe("approve_for_future_card_write_path");

    const mayerli = report.approvalItems.find((item) => item.targetPersonId === "ig:mayuyis2626");
    expect(mayerli).toMatchObject({
      status: "blocked_open_evidence_questions",
      recommendedAction: "review_deferred_write",
      approvalScopes: [],
      identitySummary: {
        email: null,
        phone: "3115381341",
        evidenceDecisionSummary: {
          keptUnassignedEmails: ["mayaariana@hotmail.com"],
        },
      },
    });
    expect(mayerli?.openQuestions.map((question) => question.candidateEmail)).toEqual(["mayariana@hotmail.com"]);
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("marks existing-card enrichment as ready for human approval only", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
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
      readyForHumanApproval: 1,
      operationsExecuted: 0,
    });
    expect(report.approvalItems[0]).toMatchObject({
      status: "ready_for_human_approval",
      recommendedAction: "enrich_existing_card",
      targetPersonId: "ig:ana_yoga",
      safeApprovalBoundary: "Human approval here authorizes only the next reviewed card-write path; this packet still executes no mutation.",
    });
  });

  test("keeps evidence-derived email candidates blocked until ownership approval", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
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
      items: 1,
      readyForHumanApproval: 0,
      blockedOpenEvidenceQuestions: 1,
      blockedNeedsMoreIdentity: 0,
      openEvidenceQuestions: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(report.approvalItems[0]).toMatchObject({
      status: "blocked_open_evidence_questions",
      targetPersonId: "email:amaliadbg@hotmail.com",
      recommendedAction: "review_deferred_write",
      identitySummary: {
        displayName: "Amalia De Bedout",
        email: "amaliadbg@hotmail.com",
      },
    });
    expect(report.approvalItems[0].openQuestions.map((question) => question.candidateEmail)).toEqual([
      "amaliadbg@hotmail.com",
    ]);
  });

  test("blocks weak-candidate replacements until evidence ownership is approved", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
      text: "CRM: Luis Enrique Lopera entra a clases de yoga y ha asistido a varios retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "email:lazaretas@gmail.com",
          displayName: "Jorge Luis Lazaro",
          identities: { email: "lazaretas@gmail.com" },
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

    expect(report.summary).toMatchObject({
      readyForHumanApproval: 0,
      blockedOpenEvidenceQuestions: 1,
      blockedNeedsMoreIdentity: 0,
      openEvidenceQuestions: 1,
    });
    expect(report.approvalItems[0]).toMatchObject({
      status: "blocked_open_evidence_questions",
      targetPersonId: "email:luis.e.lopera@gmail.com",
      identitySummary: {
        displayName: "Luis Enrique Lopera",
        email: "luis.e.lopera@gmail.com",
      },
    });
    expect(report.approvalItems[0].openQuestions.map((question) => question.candidateEmail)).toEqual([
      "luis.e.lopera@gmail.com",
    ]);
  });

  test("blocks approval when a weak candidate only shares a partial name", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
      text: "CRM: Luis Enrique Lopera entra a clases de yoga.",
      now: NOW,
      batch: {
        summary: {
          items: 1,
          approvalReady: 0,
          reviewNeeded: 1,
          identityNeeded: 0,
          deferred: 0,
          openEvidenceQuestions: 0,
          appliedEvidenceDecisions: 0,
          operationsPreviewed: 1,
          operationsExecuted: 0,
          cardMutationReady: false,
        },
        items: [{
          batchItemId: "batch-luis",
          previewId: "preview-luis",
          decisionId: "decision-luis",
          clueId: "clue-luis",
          stage: "review_needed",
          recommendedAction: "review_deferred_write",
          targetPersonId: "email:lazaretas@gmail.com",
          subject: {
            label: "Luis Enrique Lopera",
            proposedDisplayName: "Jorge Luis Lazaro",
            rawName: "Luis Enrique Lopera",
            instagramHandle: null,
          },
          identity: {
            displayName: "Jorge Luis Lazaro",
            email: "lazaretas@gmail.com",
            phone: null,
            instagramHandle: null,
            missingContactFields: ["phone", "instagramHandle"],
            fullNameCandidates: ["Jorge Luis Lazaro"],
            emailCandidates: ["lazaretas@gmail.com"],
            phoneCandidates: [],
            evidenceDecisionSummary: {
              confirmedSubjectEmails: [],
              keptUnassignedEmails: [],
              relatedPersonCandidateEmails: [],
              needsMoreEvidenceEmails: [],
              ignoredEmails: [],
              appliedDecisionRecordIds: [],
            },
          },
          evidenceGrade: "low",
          evidenceScore: 62,
          sourceSignals: [],
          currentCard: { exists: true, personId: "email:lazaretas@gmail.com", displayName: null, evidenceCount: 1 },
          proposedServices: [],
          relationshipContexts: [],
          restrictedServiceOperations: 0,
          openQuestions: [{
            questionId: "question-luis-email",
            type: "email_ownership",
            priority: "high",
            candidateEmail: "lazaretas@gmail.com",
            recommendedOptionId: "needs_more_evidence",
          }],
          blockers: ["card_write_policy", "identity_match", "merge_policy"],
          nextEvidenceActions: [],
          operationsPreviewed: 1,
          operationsExecuted: 0,
          safeNextStep: "Keep in deferred review until identity and merge policy are clear.",
        }],
      } as never,
    });

    expect(report.summary).toMatchObject({
      readyForHumanApproval: 0,
      blockedOpenEvidenceQuestions: 0,
      blockedNeedsMoreIdentity: 1,
    });
    expect(report.approvalItems[0]).toMatchObject({
      status: "blocked_needs_more_identity",
      targetPersonId: "email:lazaretas@gmail.com",
      approvalScopes: [],
    });
  });

  test("blocks handle-only items when connected evidence has ambiguous names or phones", () => {
    const report = buildCrmVNextCardWriteApprovalPacket({
      text: "CRM: @cadavid_eli se llama Eliana y asiste a Encuentro Feliz.",
      now: NOW,
      batch: {
        summary: {
          items: 1,
          approvalReady: 1,
          reviewNeeded: 0,
          identityNeeded: 0,
          deferred: 0,
          openEvidenceQuestions: 0,
          appliedEvidenceDecisions: 0,
          operationsPreviewed: 2,
          operationsExecuted: 0,
          cardMutationReady: false,
        },
        packetSummary: {} as never,
        previewSummary: {} as never,
        items: [{
          batchItemId: "batch-eliana",
          previewId: "preview-eliana",
          decisionId: "decision-eliana",
          clueId: "clue-eliana",
          stage: "approval_ready",
          recommendedAction: "review_merge_or_create",
          targetPersonId: "ig:cadavid_eli",
          subject: {
            label: "Eliana",
            proposedDisplayName: "Eliana Ortegon Palacios",
            rawName: "Eliana",
            instagramHandle: "cadavid_eli",
          },
          identity: {
            displayName: "Eliana Ortegon Palacios",
            email: null,
            phone: "3118440217",
            instagramHandle: "cadavid_eli",
            missingContactFields: ["email"],
            fullNameCandidates: ["Eliana Ortegon Palacios", "Subachoque Profe Eliana"],
            emailCandidates: [],
            phoneCandidates: ["3118440217", "+573104954266"],
            evidenceDecisionSummary: {
              confirmedSubjectEmails: [],
              keptUnassignedEmails: [],
              relatedPersonCandidateEmails: [],
              needsMoreEvidenceEmails: [],
              ignoredEmails: [],
              appliedDecisionRecordIds: [],
            },
          },
          evidenceGrade: "high",
          evidenceScore: 92,
          sourceSignals: [],
          currentCard: { exists: false, personId: null, displayName: null, evidenceCount: 0 },
          proposedServices: [],
          relationshipContexts: [],
          restrictedServiceOperations: 0,
          openQuestions: [],
          blockers: [],
          nextEvidenceActions: [],
          operationsPreviewed: 2,
          operationsExecuted: 0,
          safeNextStep: "Ready for a separate human card-write approval, still not auto-applied.",
        }],
      } as never,
    });

    expect(report.summary).toMatchObject({
      readyForHumanApproval: 0,
      blockedNeedsMoreIdentity: 1,
    });
    expect(report.approvalItems[0]).toMatchObject({
      status: "blocked_needs_more_identity",
      targetPersonId: "ig:cadavid_eli",
      approvalScopes: [],
    });
  });
});
