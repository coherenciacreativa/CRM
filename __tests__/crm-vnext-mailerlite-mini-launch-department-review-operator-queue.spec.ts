import { describe, expect, test } from "vitest";

import {
  buildDepartmentRow,
  buildOperatorQueue,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-operator-queue.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const delivery = {
  department: "brand",
  label: "Brand Hub / Brand Department OS",
  priority: 1,
  responseTemplate: "/tmp/templates/brand_response_template.json",
  expectedResponsePath: "/tmp/responses/brand_response.json",
  packetMarkdown: "/tmp/brand_packet.md",
  safeMessage: "Revisa Brand.\nRecommendation is not routing.\nCC · Journey · Editorial onboarding · Eligible",
};

const workingCopy = {
  department: "brand",
  pendingPath: "/tmp/responses/brand_response.pending.json",
  finalResponsePath: "/tmp/responses/brand_response.json",
  templateSourcePath: "/tmp/templates/brand_response_template.json",
};

const preflightDepartment = {
  department: "brand",
  state: "draft_assist_available_needs_department_review",
  finalResponsePath: "/tmp/responses/brand_response.json",
  acceptedFinalResponse: false,
  pendingCanBecomeFinal: false,
  codexDraftAvailable: true,
  candidates: {
    final: {
      blockers: ["file_missing"],
      nextSafeStep: "Create or collect this response file.",
    },
    pending: {
      path: "/tmp/responses/brand_response.pending.json",
      blockers: [
        "missing:sequenceDecision",
        "missing:groupDecisionStatus:CC · Source · Quiz · Inteligencia para descansar",
      ],
      nextSafeStep: "Revise response before reconciliation.",
    },
    codex_draft: {
      path: "/tmp/drafts/brand_response.codex_draft.json",
      blockers: [
        "missing:reviewMode",
        "unsafe:codexDraftMeta_must_not_be_present_in_final_response",
      ],
    },
  },
  nextSafeStep: "Ask the department to review the Codex draft and produce a clean final response.",
};

const draftFile = {
  department: "brand",
  draftPath: "/tmp/drafts/brand_response.codex_draft.json",
  finalResponsePath: "/tmp/responses/brand_response.json",
  reviewMode: "draft_no_live_review",
};

const baseSources = [
  {
    path: "/tmp/delivery.json",
    present: true,
    chars: 100,
    consultedFor: "test delivery",
  },
];

describe("CRM vNext MailerLite department review operator queue", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/queue.json",
      "--markdown-out",
      "/tmp/queue.md",
    ]);

    expect(parsed.deliveryPack).toContain("mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.finalizationPreflight).toContain("mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(parsed.draftAssist).toContain("mailerlite_mini_launch_department_review_draft_assist_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/queue.json");
  });

  test("builds a department row with exact blockers and message block", () => {
    const row = buildDepartmentRow({
      department: "brand",
      delivery,
      workingCopy,
      preflightDepartment,
      draftFile,
    });

    expect(row.action).toBe("ask_department_to_review_codex_draft_and_save_clean_final_response");
    expect(row.finalResponsePath).toBe("/tmp/responses/brand_response.json");
    expect(row.pendingPath).toBe("/tmp/responses/brand_response.pending.json");
    expect(row.codexDraftPath).toBe("/tmp/drafts/brand_response.codex_draft.json");
    expect(row.expectedResponsePathMatches).toBe(true);
    expect(row.missingFields).toContain("missing:sequenceDecision");
    expect(row.messageBlock).toContain("Recommendation is not routing");
  });

  test("builds a queue that waits for final responses and keeps live gates closed", () => {
    const queue = buildOperatorQueue({
      deliveryPack: {
        status: "department_review_delivery_pack_ready_no_live_changes",
        launch,
        pendingDepartments: ["brand"],
        deliveries: [delivery],
        liveGateSummary: { openLiveGateCount: 0 },
        validationCommands: {
          intake: "npm run intake",
          reconciliation: "npm run reconciliation",
        },
      },
      responseWorkspace: {
        launch,
        readyForIntake: false,
        pendingDepartments: ["brand"],
        workingCopies: [workingCopy],
        liveGateSummary: { openLiveGateCount: 0 },
        commands: {
          intake: "npm run intake workspace",
          reconciliation: "npm run reconciliation workspace",
        },
      },
      finalizationPreflight: {
        launch,
        readyForIntake: false,
        awaitingDepartments: ["brand"],
        departments: [preflightDepartment],
      },
      draftAssist: {
        launch,
        draftFiles: [draftFile],
      },
      sourceDigests: baseSources,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(queue.status).toBe("department_review_operator_queue_waiting_final_responses_no_live_changes");
    expect(queue.summary).toMatchObject({
      departmentCount: 1,
      acceptedCount: 0,
      awaitingFinalCount: 1,
      readyForIntake: false,
      openLiveGateCount: 0,
    });
    expect(queue.validationCommands.intake).toBe("npm run intake workspace");
    expect(queue.safety).toMatchObject({
      localOnly: true,
      finalResponsesWritten: false,
      mailerLiteApiCalled: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders markdown with message block, final path and hard stops", () => {
    const queue = buildOperatorQueue({
      deliveryPack: {
        launch,
        pendingDepartments: ["brand"],
        deliveries: [delivery],
        liveGateSummary: { openLiveGateCount: 0 },
      },
      responseWorkspace: {
        launch,
        readyForIntake: false,
        pendingDepartments: ["brand"],
        workingCopies: [workingCopy],
      },
      finalizationPreflight: {
        launch,
        readyForIntake: false,
        awaitingDepartments: ["brand"],
        departments: [preflightDepartment],
      },
      draftAssist: {
        launch,
        draftFiles: [draftFile],
      },
      sourceDigests: baseSources,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(queue);

    expect(markdown).toContain("Department Review Operator Queue");
    expect(markdown).toContain("/tmp/responses/brand_response.json");
    expect(markdown).toContain("Recommendation is not routing");
    expect(markdown).toContain("Do not treat message blocks, pending files or Codex drafts as final responses");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
  });
});
