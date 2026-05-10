import { describe, expect, test } from "vitest";
import { buildCrmVNextBatchOperatingLoop } from "../lib/crm/crm-vnext-batch-operating-loop";
import type { CrmDeepLocalSource } from "../lib/crm/crm-vnext-deep-local-stitching";
import type { CrmStoredEvidenceReviewDecision } from "../lib/crm/crm-vnext-evidence-review-decisions";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-11T12:00:00.000Z";

const gulnaraDecision: CrmStoredEvidenceReviewDecision = {
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
};

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

describe("buildCrmVNextBatchOperatingLoop", () => {
  test("routes a confirmed batch item into ready write preview", () => {
    const loop = buildCrmVNextBatchOperatingLoop({
      text: "CRM: @gulnarapaola se llama Gulnara Paola Castaño Reyes, y preguntó por el retiro.",
      sourceKind: "instagram_signal",
      reporter: "Mantis",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "ig:gulnarapaola",
          identities: { instagramHandle: "gulnarapaola" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
      localSources: evidenceSources,
      sourceCoverage: {
        roots: 0,
        filesScanned: 0,
        filesSkipped: 0,
        sourcesLoaded: evidenceSources.length,
        connectedEvidenceSources: evidenceSources.length,
      },
      evidenceReviewDecisions: [gulnaraDecision],
      applyAllReady: true,
      commit: false,
    });

    expect(loop.mode).toBe("read_only_batch_operating_loop");
    expect(loop.summary.operationsExecuted).toBe(0);
    expect(loop.summary.cardMutationReady).toBe(false);
    expect(loop.summary.readyForCardWriteApproval).toBeGreaterThanOrEqual(1);
    expect(loop.summary.readyWritePlanItems).toBeGreaterThanOrEqual(1);
    expect(loop.readyWritePreview.summary.committed).toBe(false);
    expect(loop.readyWritePreview.planItems[0]).toMatchObject({
      status: "ready_to_commit",
      targetPersonId: "ig:gulnarapaola",
      recommendedAction: "enrich_existing_card",
    });
    expect(loop.readyWritePreview.planItems[0].proposedCard?.identities).toMatchObject({
      email: "gulnacast@gmail.com",
      instagramHandle: "gulnarapaola",
      phone: "+573004477735",
    });

    expect(JSON.stringify(loop)).not.toContain("/Users/");
  });

  test("builds a blocked identity queue with Mantis search prompts", () => {
    const loop = buildCrmVNextBatchOperatingLoop({
      text: "CRM: @lavivirozo preguntó por el retiro y falta más identidad estable.",
      sourceKind: "instagram_signal",
      reporter: "Mantis",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [],
      sourceCoverage: {
        roots: 0,
        filesScanned: 0,
        filesSkipped: 0,
        sourcesLoaded: 0,
        connectedEvidenceSources: 0,
      },
      workbench: {
        summary: {
          reviewItems: 0,
          queueItems: 0,
          highPriority: 0,
          recommendedConfirmEmailForSubject: 0,
          recommendedKeepUnassigned: 0,
          recommendedMoreEvidence: 0,
          readyForHumanApproval: 0,
          blockedOpenEvidenceQuestions: 0,
          operationsPreviewed: 0,
          operationsExecuted: 0,
          cardMutationReady: false,
        },
        queueItems: [],
      } as never,
      approvalPacket: {
        summary: {
          items: 1,
          readyForHumanApproval: 0,
          blockedOpenEvidenceQuestions: 0,
          blockedNeedsMoreIdentity: 1,
          openEvidenceQuestions: 0,
          approvalScopesRequested: 0,
          restrictedServiceApprovalItems: 0,
          operationsPreviewed: 2,
          operationsExecuted: 0,
          cardMutationReady: false,
        },
        approvalItems: [{
          approvalItemId: "approval-viviana",
          batchItemId: "batch-viviana",
          status: "blocked_needs_more_identity",
          targetPersonId: "ig:lavivirozo",
          subject: {
            label: "Viviana Rozo",
            proposedDisplayName: "Viviana Rozo Maldonado",
            rawName: "Viviana",
            instagramHandle: "lavivirozo",
          },
          recommendedAction: "review_merge_or_create",
          requestedDecision: {
            prompt: "Hold Viviana: gather stronger identity before approval.",
            approveOptionId: "approve_for_future_card_write_path",
            holdOptionId: "keep_in_review",
            rejectOptionId: "reject_candidate",
          },
          identitySummary: {
            displayName: "Viviana Rozo Maldonado",
            email: null,
            phone: null,
            instagramHandle: "lavivirozo",
            missingContactFields: ["email", "phone"],
            fullNameCandidates: ["Viviana Rozo Maldonado"],
            emailCandidates: [],
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
          proposedServices: [{ serviceKey: "retreats", label: "Retreats" }],
          relationshipContexts: [],
          openQuestions: [],
          approvalScopes: [],
          approvalChecklist: [],
          blockers: ["identity_match"],
          nextEvidenceActions: ["Find a stable email or phone before approval."],
          operationsPreviewed: 2,
          operationsExecuted: 0,
          safeApprovalBoundary: "This item is not ready for card-write approval.",
        }],
      } as never,
      applyDryRun: {
        mode: "dry_run_card_write_apply",
        summary: {
          approvalItems: 1,
          readyApprovalItems: 0,
          selectedItems: 0,
          commitEligibleItems: 0,
          blockedItems: 0,
          cardsToUpsert: 0,
          mergeReviewsToStage: 0,
          operationsPlanned: 0,
          operationsExecuted: 0,
          committed: false,
          commitBlocked: false,
          commitBlockers: [],
        },
        planItems: [],
      } as never,
    });

    expect(loop.summary).toMatchObject({
      blockedIdentityItems: 1,
      readyForCardWriteApproval: 0,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(loop.blockedIdentityQueue[0]).toMatchObject({
      status: "blocked_needs_more_identity",
      recommendedSearchLanes: expect.arrayContaining([
        "mailerlite_cursor_scan",
        "gmail_search",
        "google_drive_retreat_tables",
        "lead_capture_traces",
      ]),
    });
    expect(loop.blockedIdentityQueue[0].operatorPrompt).toContain("Mantis: busca en modo read-only");
    expect(loop.blockedIdentityQueue[0].operatorPrompt).toContain("No mutar CRM");
    expect(JSON.stringify(loop)).not.toContain("/Users/");
  });
});
