import { describe, expect, test } from "vitest";

import {
  buildResponseWatcher,
  buildRows,
  buildSafety,
  parseArgs,
  renderMarkdown,
  rowStatusFor,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-response-watcher.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const paths = {
  brandRequest: "/tmp/requests/01_brand_final_response_request.txt",
  webRequest: "/tmp/requests/02_web_design_final_response_request.txt",
  crmRequest: "/tmp/requests/03_crm_final_response_request.txt",
  brandPending: "/tmp/responses/brand_response.pending.json",
  webPending: "/tmp/responses/web_design_response.pending.json",
  crmPending: "/tmp/responses/crm_response.pending.json",
  brandFinal: "/tmp/responses/brand_response.json",
  webFinal: "/tmp/responses/web_design_response.json",
  crmFinal: "/tmp/responses/crm_response.json",
  brandDraft: "/tmp/drafts/brand_response.codex_draft.json",
  webDraft: "/tmp/drafts/web_design_response.codex_draft.json",
  crmDraft: "/tmp/drafts/crm_response.codex_draft.json",
};

const requestBundle = {
  launch,
  summary: {
    openLiveGateCount: 0,
  },
  requests: [
    {
      department: "brand",
      label: "Brand Hub / Brand Department OS",
      finalResponsePath: paths.brandFinal,
      pendingPath: paths.brandPending,
      requestPath: paths.brandRequest,
      codexDraftPath: paths.brandDraft,
    },
    {
      department: "web_design",
      label: "Web Design",
      finalResponsePath: paths.webFinal,
      pendingPath: paths.webPending,
      requestPath: paths.webRequest,
      codexDraftPath: paths.webDraft,
    },
    {
      department: "crm",
      label: "CRM",
      finalResponsePath: paths.crmFinal,
      pendingPath: paths.crmPending,
      requestPath: paths.crmRequest,
      codexDraftPath: paths.crmDraft,
    },
  ],
};

const responseWorkspace = {
  launch,
  workingCopies: [
    {
      department: "brand",
      finalResponsePath: paths.brandFinal,
      pendingPath: paths.brandPending,
    },
    {
      department: "web_design",
      finalResponsePath: paths.webFinal,
      pendingPath: paths.webPending,
    },
    {
      department: "crm",
      finalResponsePath: paths.crmFinal,
      pendingPath: paths.crmPending,
    },
  ],
  liveGateSummary: {
    openLiveGateCount: 0,
  },
  commands: {
    intakeWhenFinalResponsesExist: "npm run intake",
    reconciliationWhenIntakeAcceptsResponses: "npm run reconciliation",
  },
};

const waitingPreflight = {
  launch,
  readyForIntake: false,
  departments: [
    {
      department: "brand",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      candidates: {
        final: { path: paths.brandFinal },
        pending: { path: paths.brandPending },
        codex_draft: { path: paths.brandDraft },
      },
    },
    {
      department: "web_design",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      candidates: {
        final: { path: paths.webFinal },
        pending: { path: paths.webPending },
        codex_draft: { path: paths.webDraft },
      },
    },
    {
      department: "crm",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      candidates: {
        final: { path: paths.crmFinal },
        pending: { path: paths.crmPending },
        codex_draft: { path: paths.crmDraft },
      },
    },
  ],
};

describe("CRM vNext MailerLite department response watcher", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/watcher.json",
      "--markdown-out",
      "/tmp/watcher.md",
    ]);

    expect(parsed.requestBundle).toContain("mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.finalizationPreflight).toContain("mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/watcher.json");
    expect(parsed.markdownOut).toBe("/tmp/watcher.md");
  });

  test("classifies row states without treating pending files as finals", () => {
    expect(rowStatusFor({
      finalExists: false,
      pendingExists: true,
      requestExists: true,
      acceptedFinalResponse: false,
    })).toBe("pending_working_copy_present_waiting_department_final_response");
    expect(rowStatusFor({
      finalExists: true,
      pendingExists: true,
      requestExists: true,
      acceptedFinalResponse: false,
    })).toBe("final_response_file_present_requires_fresh_preflight");
    expect(rowStatusFor({
      finalExists: true,
      pendingExists: true,
      requestExists: true,
      acceptedFinalResponse: true,
    })).toBe("accepted_final_response_ready_for_intake");
  });

  test("builds rows from request, workspace and preflight paths", () => {
    const rows = buildRows({
      requestBundle,
      responseWorkspace,
      finalizationPreflight: waitingPreflight,
      fileStates: {
        [paths.brandRequest]: true,
        [paths.webRequest]: true,
        [paths.crmRequest]: true,
        [paths.brandPending]: true,
        [paths.webPending]: true,
        [paths.crmPending]: true,
      },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      department: "brand",
      finalExists: false,
      pendingExists: true,
      requestExists: true,
      codexDraftExists: false,
      status: "pending_working_copy_present_waiting_department_final_response",
    });
  });

  test("reports waiting state while final response files are missing", () => {
    const watcher = buildResponseWatcher({
      requestBundle,
      responseWorkspace,
      finalizationPreflight: waitingPreflight,
      fileStates: {
        [paths.brandRequest]: true,
        [paths.webRequest]: true,
        [paths.crmRequest]: true,
        [paths.brandPending]: true,
        [paths.webPending]: true,
        [paths.crmPending]: true,
      },
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(watcher.status).toBe("department_review_response_watcher_waiting_final_responses_no_live_changes");
    expect(watcher.summary).toMatchObject({
      acceptedFinalCount: 0,
      finalFilePresentCount: 0,
      missingFinalCount: 3,
      pendingPresentCount: 3,
      requestPresentCount: 3,
      readyForIntake: false,
      openLiveGateCount: 0,
    });
    expect(watcher.missingFinalDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(watcher.summary.nextBestMove).toContain("brand, web_design, crm");
    expect(watcher.safety).toMatchObject({
      localOnly: true,
      finalResponsesWritten: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("moves to preflight state when all final files exist but are not accepted yet", () => {
    const watcher = buildResponseWatcher({
      requestBundle,
      responseWorkspace,
      finalizationPreflight: waitingPreflight,
      fileStates: {
        [paths.brandFinal]: true,
        [paths.webFinal]: true,
        [paths.crmFinal]: true,
      },
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(watcher.status).toBe("department_review_response_watcher_ready_for_finalization_preflight_no_live_changes");
    expect(watcher.summary.nextBestMove).toBe("Run finalization preflight now; all expected final response files exist.");
  });

  test("reports ready for intake only when preflight accepted every final response", () => {
    const acceptedPreflight = {
      ...waitingPreflight,
      departments: waitingPreflight.departments.map((department) => ({
        ...department,
        acceptedFinalResponse: true,
      })),
    };
    const watcher = buildResponseWatcher({
      requestBundle,
      responseWorkspace,
      finalizationPreflight: acceptedPreflight,
      fileStates: {
        [paths.brandFinal]: true,
        [paths.webFinal]: true,
        [paths.crmFinal]: true,
      },
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(watcher.status).toBe("department_review_response_watcher_ready_for_intake_no_live_changes");
    expect(watcher.summary.readyForIntake).toBe(true);
    expect(watcher.acceptedFinalDepartments).toEqual(["brand", "web_design", "crm"]);
  });

  test("renders markdown with next safe steps and safety boundary", () => {
    const watcher = buildResponseWatcher({
      requestBundle,
      responseWorkspace,
      finalizationPreflight: waitingPreflight,
      fileStates: {
        [paths.brandRequest]: true,
        [paths.brandPending]: true,
      },
      sourceDigests: [
        {
          path: "/tmp/request-bundle.json",
          present: true,
          chars: 100,
          consultedFor: "request bundle",
        },
      ],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(watcher);

    expect(markdown).toContain("Department Response Watcher");
    expect(markdown).toContain("Brand Hub / Brand Department OS");
    expect(markdown).toContain("Keep collecting final response files");
    expect(markdown).toContain("No crea respuestas");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
  });

  test("keeps safety flags closed", () => {
    expect(buildSafety()).toMatchObject({
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      workflowMutationsPerformed: false,
      outboundPerformed: false,
    });
  });
});
