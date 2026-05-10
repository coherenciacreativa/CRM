import { describe, expect, test } from "vitest";
import { buildCrmVNextCardWriteMergePolicy } from "../lib/crm/crm-vnext-card-write-merge-policy.js";
import { parseMailerBridgeCandidatesCsv } from "../lib/crm/crm-vnext-identity-stitching-research.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mailerCsv = [
  "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
  "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Consejeros;Asistentes a retiros;Aliados importantes;Amigos de la Fundación;Medellín,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
].join("\n");

describe("CRM vNext card write/merge policy", () => {
  test("keeps Juan Jose as mailer-based merge/create review with restricted service approval", () => {
    const report = buildCrmVNextCardWriteMergePolicy({
      text: "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología, es amigo y aliado consultor de Coherencia Creativa.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv(mailerCsv),
      localSources: [],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0 },
    });

    expect(report.mode).toBe("read_only_card_write_merge_policy");
    expect(report.summary.decisions).toBe(1);
    expect(report.summary.mergeOrMailerReviewCandidates).toBe(1);
    expect(report.summary.needsIdentityReview).toBe(1);
    expect(report.summary.needsPrivacyReview).toBe(1);

    const decision = report.decisions[0];
    expect(decision.target).toMatchObject({
      type: "new_card_from_mailer_candidate",
      personId: "email:juanjotru@gmail.com",
    });
    expect(decision.serviceKeys.sort()).toEqual([
      "retreats",
      "therapy_consultations",
      "yoga_classes",
    ]);
    expect(decision.evidenceAssessment.sourceSignals).toContain("mailer_lite_bridge_candidate");
    expect(decision.recommendedWrite).toMatchObject({
      action: "merge_or_create_from_mailer_candidate_after_review",
      eligibility: "needs_identity_and_privacy_review",
      automaticWriteAllowed: false,
      automaticMergeAllowed: false,
    });
    expect(decision.recommendedWrite.requiredApprovals).toEqual(expect.arrayContaining([
      "card_write_policy",
      "identity_match",
      "merge_policy",
      "privacy_restricted_service",
    ]));
    expect(report.sourceConsultationPolicy.mailerLite.routes.map((route) => route.id)).toContain("mailerlite_read_only_ui_or_export");
  });

  test("defers Mayerli creation when Gmail/browser evidence exists and asks to review the packet", () => {
    const report = buildCrmVNextCardWriteMergePolicy({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
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
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const decision = report.decisions[0];
    expect(report.summary.deferredWrites).toBe(1);
    expect(decision.target).toMatchObject({
      type: "new_card_from_stable_identity",
      personId: "ig:mayuyis2626",
    });
    expect(decision.evidenceAssessment.sourceSignals).toEqual(expect.arrayContaining([
      "gmail_evidence_present",
      "deep_local_defers_new_card_creation",
    ]));
    expect(decision.recommendedWrite.action).toBe("defer_write_prepare_review_packet");
    expect(decision.recommendedWrite.nextEvidenceActions.join(" ")).toContain("MailerLite");
    expect(report.sourceConsultationPolicy.gmail.routes.map((route) => route.id)).toContain("mantis_chrome_gmail_browser");
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("promotes a single compatible evidence identity into a review-only target", () => {
    const report = buildCrmVNextCardWriteMergePolicy({
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
          sourceKind: "google_drive_export",
          text: "Name: Amalia De Bedout Email: amaliadbg@hotmail.com Context: yoga, estudiantes, asistentes a retiros.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    const decision = report.decisions[0];
    expect(decision.target).toMatchObject({
      type: "review_possible_candidates",
      personId: "email:amaliadbg@hotmail.com",
      displayName: "Amalia De Bedout",
      identities: {
        email: "amaliadbg@hotmail.com",
      },
      source: "fact_hint",
    });
    expect(decision.evidenceAssessment.sourceSignals).toContain("evidence_derived_identity_candidate");
    expect(decision.recommendedWrite).toMatchObject({
      action: "defer_write_prepare_review_packet",
      eligibility: "needs_identity_review",
      automaticWriteAllowed: false,
      automaticMergeAllowed: false,
    });
  });

  test("replaces a weak name-only candidate with stronger connected evidence", () => {
    const report = buildCrmVNextCardWriteMergePolicy({
      text: "CRM: Natalia Cárdenas de Bedut es estudiante de yoga y ha asistido a retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "email:nataliaprato@gmail.com",
          displayName: "Natalia Prato",
          identities: { email: "nataliaprato@gmail.com" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "contacts:macos:natalia-cardenas",
          sourceKind: "contacts_app_export",
          text: "Name: Natalia Cárdenas De Bedout Email: natis1000@hotmail.com Phone present.",
        },
        {
          sourceId: "google-drive:seminario-2014:natalia",
          sourceKind: "google_drive_export",
          text: "Name: NATALIA CARDENAS Email: ncardenadb@gmail.com Context: seminar/retreat community sheet.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 2 },
    });

    const decision = report.decisions[0];
    expect(decision.target).toMatchObject({
      type: "review_possible_candidates",
      personId: "email:natis1000@hotmail.com",
      displayName: "Natalia Cárdenas De Bedout",
      identities: {
        email: "natis1000@hotmail.com",
      },
      source: "fact_hint",
    });
    expect(decision.evidenceAssessment.sourceSignals).toEqual(expect.arrayContaining([
      "evidence_derived_identity_candidate",
      "evidence_replaces_weak_identity_candidate",
      "contacts_evidence_present",
      "google_drive_evidence_present",
    ]));
    expect(decision.recommendedWrite.reason).toContain("stronger than the weak current candidate");
  });

  test("allows an existing-card enrichment proposal without automatic write", () => {
    const report = buildCrmVNextCardWriteMergePolicy({
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

    const decision = report.decisions[0];
    expect(report.summary.enrichExistingCardCandidates).toBe(1);
    expect(report.summary.readyForHumanApprovedWrite).toBe(1);
    expect(decision.recommendedWrite).toMatchObject({
      action: "enrich_existing_card_after_review",
      eligibility: "ready_for_human_approved_write",
      automaticWriteAllowed: false,
      automaticMergeAllowed: false,
    });
    expect(decision.recommendedWrite.requiredApprovals).toEqual(["card_write_policy"]);
    expect(report.safety.cardMutationProhibited).toBe(true);
  });
});
