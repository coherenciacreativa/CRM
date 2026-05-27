import { describe, expect, test } from "vitest";

import {
  buildRequestBundle,
  parseArgs,
  renderMarkdown,
  renderRequestText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-request-bundle.mjs";

const row = {
  department: "brand",
  label: "Brand Hub / Brand Department OS",
  priority: 1,
  state: "draft_assist_available_needs_department_review",
  action: "ask_department_to_review_codex_draft_and_save_clean_final_response",
  finalResponsePath: "/tmp/responses/brand_response.json",
  pendingPath: "/tmp/responses/brand_response.pending.json",
  codexDraftPath: "/tmp/drafts/brand_response.codex_draft.json",
  responseTemplate: "/tmp/templates/brand_response_template.json",
  missingFields: [
    "missing:sequenceDecision",
    "missing:groupDecisionStatus:CC · Source · Quiz · Inteligencia para descansar",
  ],
  messageBlock: [
    "Revisa este paquete no-live para Brand.",
    "Recommendation is not routing.",
    "CC · Journey · Editorial onboarding · Eligible",
  ].join("\n"),
};

const operatorQueue = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  summary: {
    readyForIntake: false,
    openLiveGateCount: 0,
  },
  validationCommands: {
    finalizationPreflight: "npm run preflight",
    intake: "npm run intake",
    reconciliation: "npm run reconciliation",
  },
  rows: [row],
};

describe("CRM vNext MailerLite department review request bundle", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/request-bundle.json",
      "--markdown-out",
      "/tmp/request-bundle.md",
    ]);

    expect(parsed.operatorQueue).toContain("mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json");
    expect(parsed.requestsDir).toContain("mailerlite_mini_launch_department_review_requests_inteligencia_descansar_2026-05-27");
    expect(parsed.out).toBe("/tmp/request-bundle.json");
  });

  test("renders a request that keeps Codex draft separate from final response", () => {
    const text = renderRequestText(row);

    expect(text).toContain("respuesta final no-live");
    expect(text).toContain("/tmp/drafts/brand_response.codex_draft.json");
    expect(text).toContain("/tmp/responses/brand_response.json");
    expect(text).toContain("no cuenta como respuesta final");
    expect(text).toContain("reviewMode=no_live_review");
    expect(text).toContain("liveApprovalGranted=false");
    expect(text).toContain("No incluyas codexDraftMeta");
    expect(text).toContain("Recommendation is not routing");
    expect(text).toContain("No crear grupos, tags, workflows, subscribers ni sends");
  });

  test("builds a local-only bundle with request file paths and closed live gates", () => {
    const bundle = buildRequestBundle({
      operatorQueue,
      requestsDir: "/tmp/department-requests",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(bundle.status).toBe("department_review_request_bundle_ready_to_collect_final_responses_no_live_changes");
    expect(bundle.summary).toMatchObject({
      requestCount: 1,
      awaitingFinalCount: 1,
      readyForIntake: false,
      openLiveGateCount: 0,
    });
    expect(bundle.requests[0].requestPath).toBe("/tmp/department-requests/01_brand_final_response_request.txt");
    expect(bundle.safety).toMatchObject({
      localOnly: true,
      requestFilesWrittenOnly: true,
      finalResponsesWritten: false,
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders markdown with copy-ready request and validation commands", () => {
    const bundle = buildRequestBundle({
      operatorQueue,
      requestsDir: "/tmp/department-requests",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(bundle);

    expect(markdown).toContain("Department Review Request Bundle");
    expect(markdown).toContain("01_brand_final_response_request.txt");
    expect(markdown).toContain("npm run preflight");
    expect(markdown).toContain("Sin mensajes externos enviados");
    expect(markdown).toContain("Sin subscribers, grupos, workflows");
  });
});
