import { describe, expect, test } from "vitest";

import {
  RESPONSE_SCHEMA_VERSION,
  buildIntakeBoard,
  buildReconciliation,
  buildResponseTemplates,
  buildSafety,
  groupCandidatesFrom,
  launchFrom,
  parseArgs,
  renderMarkdown,
  validateResponse,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-intake.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const dispatchPacket = {
  ok: true,
  launch,
};

const brandCandidateReviewPacket = {
  ok: true,
  launch,
  candidateRows: [
    { name: "CC · Source · Quiz · Inteligencia para descansar" },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_dispatch_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "review requests, evidence paths and closed actions",
  },
];

const acceptedBrandResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "brand",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  sequenceDecision: "revise",
  sequenceNotes: ["Strengthen Email 2 CTA."],
  groupDecisions: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      decision: "add_as_candidate",
      proposedName: null,
      notes: [],
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      decision: "add_as_candidate",
      proposedName: null,
      notes: [],
    },
  ],
  blockers: [],
  nextSafeStep: "Revise sequence copy and rerun group dry-run.",
};

const acceptedWebResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "web_design",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  handoffDecision: "needs_revision",
  blockers: [],
  nextSafeStep: "Tighten mobile hierarchy before local build.",
};

const acceptedCrmResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "crm",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  signalBoundaryDecision: "approve",
  onboardingProtectionStatus: "protected",
  blockers: [],
  nextSafeStep: "Keep receipts store-only until seed data exists.",
};

describe("CRM vNext MailerLite mini-launch department review intake", () => {
  test("normalizes default args and response/template options", () => {
    const parsed = parseArgs([
      "--brand-response",
      "/tmp/brand.json",
      "--templates-dir",
      "/tmp/templates",
      "--out",
      "/tmp/intake.json",
      "--markdown-out",
      "/tmp/intake.md",
    ]);

    expect(parsed.dispatchPacket).toContain("mailerlite_mini_launch_department_review_dispatch_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandCandidateReviewPacket).toContain("mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandResponse).toBe("/tmp/brand.json");
    expect(parsed.templatesDir).toBe("/tmp/templates");
    expect(parsed.out).toBe("/tmp/intake.json");
    expect(parsed.markdownOut).toBe("/tmp/intake.md");
  });

  test("extracts launch and exact group candidates", () => {
    expect(launchFrom(dispatchPacket, {})).toEqual(launch);
    expect(groupCandidatesFrom(brandCandidateReviewPacket)).toEqual([
      "CC · Source · Quiz · Inteligencia para descansar",
      "CC · Delivered · Quiz result · Inteligencia para descansar",
    ]);
  });

  test("builds response templates with live approval closed", () => {
    const templates = buildResponseTemplates({ dispatchPacket, brandCandidateReviewPacket });

    expect(templates.brand.liveApprovalGranted).toBe(false);
    expect(templates.brand.groupDecisions).toHaveLength(2);
    expect(templates.web_design.handoffDecision).toBe("pending");
    expect(templates.crm.onboardingProtectionStatus).toBe("pending");
  });

  test("marks missing responses as pending and keeps live gates closed", () => {
    const templates = buildResponseTemplates({ dispatchPacket, brandCandidateReviewPacket });
    const reconciliation = buildReconciliation({
      templates,
      responses: {
        brand: null,
        web_design: null,
        crm: null,
      },
    });

    expect(reconciliation.status).toBe("awaiting_department_review_responses_no_live_changes");
    expect(reconciliation.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(reconciliation.liveGateOpenCount).toBe(0);
  });

  test("accepts complete no-live responses and blocks unsafe approvals", () => {
    const templates = buildResponseTemplates({ dispatchPacket, brandCandidateReviewPacket });
    const accepted = validateResponse({
      department: "brand",
      response: acceptedBrandResponse,
      template: templates.brand,
    });
    const unsafe = validateResponse({
      department: "crm",
      response: {
        ...acceptedCrmResponse,
        liveApprovalGranted: true,
      },
      template: templates.crm,
    });

    expect(accepted.status).toBe("accepted_no_live_review_response");
    expect(accepted.accepted).toBe(true);
    expect(unsafe.status).toBe("unsafe_response_blocked");
    expect(unsafe.unsafeReasons).toContain("liveApprovalGranted_must_be_false");
  });

  test("blocks copied Codex draft metadata even if reviewMode is changed", () => {
    const templates = buildResponseTemplates({ dispatchPacket, brandCandidateReviewPacket });
    const copiedDraft = validateResponse({
      department: "brand",
      response: {
        ...acceptedBrandResponse,
        codexDraftMeta: {
          draftOnly: true,
          acceptedByIntake: false,
        },
      },
      template: templates.brand,
    });

    expect(copiedDraft.status).toBe("unsafe_response_blocked");
    expect(copiedDraft.accepted).toBe(false);
    expect(copiedDraft.unsafeReasons).toContain("codexDraftMeta_must_not_be_present_in_final_response");
  });

  test("builds intake board ready for reconciliation only when all responses are accepted", () => {
    const pendingBoard = buildIntakeBoard({
      dispatchPacket,
      brandCandidateReviewPacket,
      responses: {
        brand: acceptedBrandResponse,
        web_design: null,
        crm: null,
      },
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const acceptedBoard = buildIntakeBoard({
      dispatchPacket,
      brandCandidateReviewPacket,
      responses: {
        brand: acceptedBrandResponse,
        web_design: acceptedWebResponse,
        crm: acceptedCrmResponse,
      },
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(pendingBoard.status).toBe("awaiting_department_review_responses_no_live_changes");
    expect(acceptedBoard.status).toBe("department_reviews_ready_for_no_live_reconciliation");
    expect(acceptedBoard.reconciliation.acceptedDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(acceptedBoard.reconciliation.liveGateOpenCount).toBe(0);
  });

  test("renders templates and safety warnings", () => {
    const board = buildIntakeBoard({
      dispatchPacket,
      brandCandidateReviewPacket,
      responses: {
        brand: null,
        web_design: null,
        crm: null,
      },
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(board);

    expect(markdown).toContain("Department Review Intake Board");
    expect(markdown).toContain("Response Templates");
    expect(markdown).toContain(RESPONSE_SCHEMA_VERSION);
    expect(markdown).toContain("liveApprovalGranted");
    expect(markdown).toContain("Sin envio de mensajes externos");
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      externalMessagesSent: false,
      groupsCreated: false,
      signalLedgerAppendPerformed: false,
    });
  });
});
