import { describe, expect, test } from "vitest";

import { RESPONSE_SCHEMA_VERSION } from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-intake.mjs";
import {
  buildActionPlan,
  buildReconciliationBoard,
  buildResponseState,
  emailActionsFromBrand,
  groupActionsFromBrand,
  parseArgs,
  renderMarkdown,
  webActionsFrom,
  crmActionsFrom,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-reconciliation.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const intakeBoard = {
  ok: true,
  launch,
  responseTemplates: {
    brand: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: "brand",
      launchId: launch.launchId,
      reviewMode: "no_live_review",
      liveApprovalGranted: false,
      groupDecisions: [
        { name: "CC · Source · Quiz · Inteligencia para descansar" },
        { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
      ],
    },
    web_design: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: "web_design",
      launchId: launch.launchId,
      reviewMode: "no_live_review",
      liveApprovalGranted: false,
    },
    crm: {
      schemaVersion: RESPONSE_SCHEMA_VERSION,
      department: "crm",
      launchId: launch.launchId,
      reviewMode: "no_live_review",
      liveApprovalGranted: false,
    },
  },
};

const brandResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "brand",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  sequenceDecision: "approve",
  sequenceNotes: [],
  groupDecisions: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      decision: "add_as_candidate",
      proposedName: null,
      notes: [],
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      decision: "rename",
      proposedName: "CC · Delivered · Quiz result · Inteligencia para descansar v2",
      notes: [],
    },
  ],
  blockers: [],
};

const webResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "web_design",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  handoffDecision: "sufficient_for_local_draft",
  proposedLocalBuildFiles: ["sections/quiz-inteligencia-descansar.liquid"],
  blockers: [],
};

const crmResponse = {
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  department: "crm",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  signalBoundaryDecision: "approve",
  onboardingProtectionStatus: "protected",
  storeOnlyEvents: ["mini_launch_email_capture"],
  projectableLaterEvents: ["mini_launch_email_reply"],
  blockers: [],
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "intake templates, pending departments and launch identity",
  },
];

describe("CRM vNext MailerLite mini-launch department review reconciliation", () => {
  test("normalizes default args and response outputs", () => {
    const parsed = parseArgs([
      "--brand-response",
      "/tmp/brand.json",
      "--web-design-response",
      "/tmp/web.json",
      "--crm-response",
      "/tmp/crm.json",
      "--out",
      "/tmp/recon.json",
      "--markdown-out",
      "/tmp/recon.md",
    ]);

    expect(parsed.intakeBoard).toContain("mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandResponse).toBe("/tmp/brand.json");
    expect(parsed.webDesignResponse).toBe("/tmp/web.json");
    expect(parsed.crmResponse).toBe("/tmp/crm.json");
    expect(parsed.out).toBe("/tmp/recon.json");
  });

  test("keeps reconciliation pending while responses are missing", () => {
    const responseState = buildResponseState({
      intakeBoard,
      responses: {
        brand: null,
        web_design: null,
        crm: null,
      },
    });
    const actionPlan = buildActionPlan({
      responseState,
      responses: {
        brand: null,
        web_design: null,
        crm: null,
      },
    });

    expect(responseState.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(actionPlan.status).toBe("blocked_until_department_reviews_accepted_no_live_changes");
    expect(actionPlan.actions).toHaveLength(0);
  });

  test("turns accepted Brand response into no-live email and group actions", () => {
    expect(emailActionsFromBrand(brandResponse).map((action) => action.id)).toContain("sequence_ready_for_email_style_qa_or_asset_plan");
    const groupActions = groupActionsFromBrand(brandResponse);

    expect(groupActions).toHaveLength(1);
    expect(groupActions[0]).toMatchObject({
      id: "rerun_group_dry_run",
      status: "ready_no_live_after_brand_response",
      liveGate: "closed",
    });
    expect(groupActions[0].inputs[1]).toMatchObject({
      decision: "rename",
      effectiveName: "CC · Delivered · Quiz result · Inteligencia para descansar v2",
    });
  });

  test("turns accepted Web and CRM responses into only no-live next moves", () => {
    expect(webActionsFrom(webResponse)[0]).toMatchObject({
      id: "prepare_scoped_shopify_local_build_request",
      status: "ready_no_live_request_only",
      liveGate: "closed_until_explicit_scope",
    });
    expect(crmActionsFrom(crmResponse).map((action) => action.id)).toEqual([
      "signal_boundaries_ready_for_future_no_live_projection_packet",
      "onboarding_protection_confirmed",
    ]);
  });

  test("blocks unsafe department responses", () => {
    const unsafeState = buildResponseState({
      intakeBoard,
      responses: {
        brand: brandResponse,
        web_design: webResponse,
        crm: {
          ...crmResponse,
          liveApprovalGranted: true,
        },
      },
    });
    const actionPlan = buildActionPlan({
      responseState: unsafeState,
      responses: {
        brand: brandResponse,
        web_design: webResponse,
        crm: {
          ...crmResponse,
          liveApprovalGranted: true,
        },
      },
    });

    expect(unsafeState.unsafeDepartments).toEqual(["crm"]);
    expect(actionPlan.status).toBe("blocked_by_unsafe_department_response_no_live_changes");
    expect(actionPlan.actions).toHaveLength(0);
  });

  test("builds reconciliation board with actions and live gates closed", () => {
    const board = buildReconciliationBoard({
      intakeBoard,
      responses: {
        brand: brandResponse,
        web_design: webResponse,
        crm: crmResponse,
      },
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.status).toBe("department_reviews_reconciled_ready_for_next_no_live_moves");
    expect(board.responseState.acceptedDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(board.liveGateSummary).toMatchObject({
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByDepartments: false,
    });
    expect(board.actionPlan.actions.map((action) => action.id)).toContain("rerun_group_dry_run");
    expect(board.safety).toMatchObject({
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      groupsCreated: false,
      signalLedgerAppendPerformed: false,
    });
  });

  test("renders pending reconciliation without pretending reviews exist", () => {
    const board = buildReconciliationBoard({
      intakeBoard,
      responses: {
        brand: null,
        web_design: null,
        crm: null,
      },
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(board);

    expect(markdown).toContain("Department Review Reconciliation");
    expect(markdown).toContain("Pending: brand, web_design, crm");
    expect(markdown).toContain("No actions yet.");
    expect(markdown).toContain("Sin MailerLite API calls");
  });
});
