import { describe, expect, test } from "vitest";
import { buildCrmVNextCardApplyPreview } from "../lib/crm/crm-vnext-card-apply-preview.js";
import { parseMailerBridgeCandidatesCsv } from "../lib/crm/crm-vnext-identity-stitching-research.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mailerCsv = [
  "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
  "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Consejeros;Asistentes a retiros;Aliados importantes;Amigos de la Fundación;Medellín,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
].join("\n");

const mayerliDriveEvidence = {
  sourceId: "google-drive:retiros-2023:row-12",
  sourceKind: "retreat_table" as const,
  text: [
    "File: Retiros 2023",
    "Name: Gladys Mayerli Garcia Ortegon",
    "Email: mayaariana@hotmail.com",
    "Phone: 3115381341",
    "City: Bogotá",
    "Country: Colombia",
    "Context: Retiro familiar; Ariana comparte este correo.",
    "Email ownership review required: email may belong to a family member or companion.",
  ].join(" "),
};

const storedEmailDecision = (
  option: "confirm_email_for_subject" | "keep_email_unassigned_family_or_companion",
) => ({
  schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10" as const,
  decisionRecordId: `decision-${option}`,
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
  selectedOptionId: option,
  selectedOptionLabel: option,
  notes: null,
  relatedPersonName: null,
  evidenceSourceIds: ["google-drive:retiros-2023:row-12"],
  effect: {
    primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: option === "confirm_email_for_subject",
    keepEmailUnassigned: option === "keep_email_unassigned_family_or_companion",
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
});

describe("CRM vNext card apply preview", () => {
  test("stages Juan Jose as merge review with no executed operations", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv(mailerCsv),
      localSources: [],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0 },
    });

    expect(report.mode).toBe("read_only_card_apply_preview");
    expect(report.summary.previews).toBe(1);
    expect(report.summary.mergeReviewPackets).toBe(1);
    expect(report.summary.restrictedServiceOperations).toBe(1);
    const preview = report.previews[0];
    expect(preview.status).toBe("blocked_requires_review");
    expect(preview.targetPersonId).toBe("email:juanjotru@gmail.com");
    expect(preview.proposedCardDraft).toMatchObject({
      personId: "email:juanjotru@gmail.com",
      identities: { email: "juanjotru@gmail.com" },
    });
    expect(preview.proposedCardDraft?.products.activeClient).toBe(true);
    expect(preview.blockedBy).toEqual(expect.arrayContaining([
      "identity_match",
      "merge_policy",
      "privacy_restricted_service",
    ]));
    expect(preview.operations.map((operation) => operation.type)).toEqual(expect.arrayContaining([
      "stage_merge_review",
      "add_service_relationship",
      "mark_restricted_service",
    ]));
    expect(preview.operations.every((operation) => operation.executed === false)).toBe(true);
    expect(preview.operations.every((operation) => operation.wouldMutate === true)).toBe(true);
    expect(report.safety.cardMutationProhibited).toBe(true);
  });

  test("stages Mayerli as deferred review packet when Gmail evidence exists", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "gmail:message:mayerli-yoga",
          sourceKind: "gmail_export",
          text: "Subject: Gladys Mayerli Garcia Ortegon has joined your meeting - Yoga Colombia\nSnippet: Mayerli joined Yoga Colombia Zoom.",
        },
        {
          sourceId: "contacts:macos:140",
          sourceKind: "contacts_app_export",
          text: "Name: Mayerli Garcia Estudiante Mama De Mango 2022 Phone: +573115381341",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 2 },
    });

    const preview = report.previews[0];
    expect(report.summary.deferredReviewPackets).toBe(1);
    expect(preview.status).toBe("deferred_review_packet");
    expect(preview.targetPersonId).toBe("ig:mayuyis2626");
    expect(preview.proposedCardDraft?.displayName).toBe("Gladys Mayerli Garcia Ortegon");
    expect(preview.proposedCardDraft?.identities.instagramHandle).toBe("mayuyis2626");
    expect(preview.proposedCardDraft?.identities.phone).toBe("+573115381341");
    expect(preview.identityResolution).toMatchObject({
      fullNameCandidates: ["Gladys Mayerli Garcia Ortegon"],
      emailCandidates: [],
      phoneCandidates: ["+573115381341"],
      instagramHandles: ["mayuyis2626"],
      missingContactFields: ["email"],
    });
    expect(preview.proposedCardDraft?.evidence.map((item) => item.source)).toContain("crm-vnext-deep-local-stitching:gmail_export");
    expect(preview.operations.map((operation) => operation.type)).toContain("stage_deferred_write_review");
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("keeps family email candidates review-only when applying Drive retreat evidence", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [mayerliDriveEvidence],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const preview = report.previews[0];
    expect(preview.status).toBe("deferred_review_packet");
    expect(preview.proposedCardDraft?.displayName).toBe("Gladys Mayerli Garcia Ortegon");
    expect(preview.proposedCardDraft?.identities.email).toBeNull();
    expect(preview.proposedCardDraft?.identities.phone).toBe("3115381341");
    expect(preview.proposedCardDraft?.identities.city).toBe("Bogotá");
    expect(preview.proposedCardDraft?.identities.country).toBe("Colombia");
    expect(preview.identityResolution.emailCandidates).toEqual(["mayaariana@hotmail.com"]);
    expect(preview.identityResolution.cityCandidates).toEqual(["Bogotá"]);
    expect(preview.identityResolution.countryCandidates).toEqual(["Colombia"]);
    expect(preview.identityResolution.missingContactFields).toContain("email");
    expect(preview.identityResolution.evidenceSourceKinds).toMatchObject({ retreat_table: 1 });
  });

  test("stages evidence-derived email identities as deferred review candidates", () => {
    const report = buildCrmVNextCardApplyPreview({
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

    const preview = report.previews[0];
    expect(preview.status).toBe("deferred_review_packet");
    expect(preview.targetPersonId).toBe("email:amaliadbg@hotmail.com");
    expect(preview.proposedCardDraft?.displayName).toBe("Amalia De Bedout");
    expect(preview.proposedCardDraft?.identities.email).toBe("amaliadbg@hotmail.com");
    expect(preview.identityResolution).toMatchObject({
      fullNameCandidates: ["Amalia De Bedout"],
      emailCandidates: ["amaliadbg@hotmail.com"],
    });
    expect(report.policy.decisions[0].evidenceAssessment.sourceSignals).toContain("evidence_derived_identity_candidate");
  });

  test("keeps structured lead-capture names and location for email-only onboarding leads", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: Katy Giraldo Aristizabal aparece como lead de Instagram/onboarding con email arquitectura.kmga@gmail.com.",
      sourceKind: "manual_import",
      reporter: "Codex",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "lead-capture:mailerlite_form:katy",
          sourceKind: "lead_capture_export" as const,
          text: [
            "Title: mailerlite_form / Orgánico exitoso en 2025 / Instagram onboarding / Katy Giraldo Aristizabal",
            "Email: arquitectura.kmga@gmail.com",
            "Observed at: 2026-05-11T00:38:35.072Z",
            "Snippet: Source: mailerlite_form Flow: Orgánico exitoso en 2025 / Instagram onboarding Contact ID: mailerlite-instagram-onboarding-katy-giraldo-aristizabal extra-pipeline-context extra-pipeline-context extra-pipeline-context extra-pipeline-context extra-pipeline-context",
            "Name: Katy Giraldo Aristizabal",
            "City: Medellín",
            "Country: Colombia",
            "Tags/groups: leads_instagram.csv, Onboarding complete",
          ].join(" "),
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const preview = report.previews[0];
    expect(preview.status).toBe("deferred_review_packet");
    expect(preview.targetPersonId).toBe("email:arquitectura.kmga@gmail.com");
    expect(preview.proposedCardDraft?.displayName).toBe("Katy Giraldo Aristizabal");
    expect(preview.proposedCardDraft?.identities).toMatchObject({
      email: "arquitectura.kmga@gmail.com",
      city: "Medellín",
      country: "Colombia",
    });
    expect(preview.identityResolution.fullNameCandidates).toEqual(["Katy Giraldo Aristizabal"]);
    expect(preview.identityResolution.cityCandidates).toEqual(["Medellín"]);
    expect(preview.identityResolution.countryCandidates).toEqual(["Colombia"]);
  });

  test("extracts a unique Instagram handle from lead-capture evidence for an email-only lead", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: Angélica Castro aparece como lead de Instagram/onboarding con email ultravioletastyle@gmail.com y teléfono +573016347540.",
      sourceKind: "manual_import",
      reporter: "Codex",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "lead-capture:mailerlite_form:angelica",
          sourceKind: "lead_capture_export" as const,
          text: [
            "Title: mailerlite_form / Orgánico exitoso en 2025 / Instagram onboarding / Angélica Castro / @angelica_alma_cele",
            "Email: ultravioletastyle@gmail.com",
            "Handle: angelica_alma_cele",
            "Snippet: Source: mailerlite_form Flow: Orgánico exitoso en 2025 / Instagram onboarding",
            "Name: Angélica Castro",
            "Instagram: @angelica_alma_cele",
            "Phone: +573016347540",
            "City: Bogotá",
            "Country: Colombia",
          ].join(" "),
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const preview = report.previews[0];
    expect(preview.proposedCardDraft?.displayName).toBe("Angélica Castro");
    expect(preview.proposedCardDraft?.identities).toMatchObject({
      email: "ultravioletastyle@gmail.com",
      instagramHandle: "angelica_alma_cele",
      phone: "+573016347540",
      city: "Bogotá",
      country: "Colombia",
    });
    expect(preview.identityResolution.instagramHandles).toEqual(["angelica_alma_cele"]);
    expect(preview.identityResolution.missingContactFields).not.toContain("instagramHandle");
  });

  test("uses Instagram DM UI search bridge evidence as a card handle candidate", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: Rocío Martínez Jaime tiene email r_mart803@hotmail.com y queremos completar su Instagram desde evidencia UI read-only.",
      sourceKind: "manual_import",
      reporter: "Mantis",
      channel: "telegram_crm",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "instagram-dm-ui:rocio-martinez-jaime",
          sourceKind: "instagram_dm_ui_export" as const,
          text: [
            "Source: Instagram DM UI search bridge",
            "Search term: r_mart803@hotmail.com",
            "Email: r_mart803@hotmail.com",
            "Name: Rocío Martínez Jaime",
            "Thread display name: Mart Marya",
            "Instagram: @maryamtzj.",
            "Handle: @maryamtzj.",
            "City: Ciudad de México",
            "Country: México",
            "Preferences: retiros; meditación",
            "Tone: cálida y curiosa",
            "Review note: read-only UI observation; no outbound message sent.",
          ].join(" "),
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const preview = report.previews[0];
    expect(preview.status).toBe("deferred_review_packet");
    expect(preview.proposedCardDraft?.displayName).toBe("Rocío Martínez Jaime");
    expect(preview.proposedCardDraft?.identities).toMatchObject({
      email: "r_mart803@hotmail.com",
      instagramHandle: "maryamtzj",
      city: "Ciudad de México",
      country: "México",
    });
    expect(preview.identityResolution.instagramHandles).toEqual(["maryamtzj"]);
    expect(preview.identityResolution.missingContactFields).not.toContain("instagramHandle");
  });

  test("applies stored keep-unassigned evidence decisions to the preview", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [mayerliDriveEvidence],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
      evidenceReviewDecisions: [storedEmailDecision("keep_email_unassigned_family_or_companion")],
    });

    const preview = report.previews[0];
    expect(preview.proposedCardDraft?.identities.email).toBeNull();
    expect(preview.identityResolution.missingContactFields).toContain("email");
    expect(preview.identityResolution.evidenceDecisionSummary).toMatchObject({
      keptUnassignedEmails: ["mayaariana@hotmail.com"],
      confirmedSubjectEmails: [],
      appliedDecisionRecordIds: ["decision-keep_email_unassigned_family_or_companion"],
    });
  });

  test("uses stored confirmed email decisions only as a preview candidate", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [mayerliDriveEvidence],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
      evidenceReviewDecisions: [storedEmailDecision("confirm_email_for_subject")],
    });

    const preview = report.previews[0];
    expect(preview.proposedCardDraft?.identities.email).toBe("mayaariana@hotmail.com");
    expect(preview.identityResolution.missingContactFields).not.toContain("email");
    expect(preview.identityResolution.evidenceDecisionSummary).toMatchObject({
      confirmedSubjectEmails: ["mayaariana@hotmail.com"],
      keptUnassignedEmails: [],
      appliedDecisionRecordIds: ["decision-confirm_email_for_subject"],
    });
    expect(preview.operations.every((operation) => operation.executed === false)).toBe(true);
  });

  test("previews an existing-card enrichment without applying it", () => {
    const report = buildCrmVNextCardApplyPreview({
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
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

    const preview = report.previews[0];
    expect(report.summary.readyForHumanApprovedApply).toBe(1);
    expect(report.summary.enrichExistingCardCandidates).toBe(1);
    expect(preview.status).toBe("ready_for_human_approved_apply");
    expect(preview.currentCard).toMatchObject({
      exists: true,
      personId: "ig:ana_yoga",
      displayName: "Ana Yoga",
    });
    expect(preview.proposedCardDraft).toBeNull();
    expect(preview.blockedBy).toEqual([]);
    expect(preview.operations[0]).toMatchObject({
      type: "enrich_existing_card",
      executed: false,
    });
  });
});
