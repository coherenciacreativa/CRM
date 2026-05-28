import { describe, expect, test } from "vitest";

import {
  buildSafety,
  buildTaxonomyRefreshResponseRequestBundle,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-request-bundle.mjs";

const handoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
};

const responseWorkspace = {
  status: "taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes",
  executiveSummary: {
    brandDecisionRowCount: 14,
    crmManifestPatchRowCount: 14,
  },
  workingCopies: [
    {
      actor: "brand",
      pendingPath: "/tmp/responses/brand_taxonomy_refresh_response.pending.json",
      finalResponsePath: "/tmp/responses/brand_taxonomy_refresh_response.json",
    },
    {
      actor: "crm",
      pendingPath: "/tmp/responses/crm_taxonomy_refresh_response.pending.json",
      finalResponsePath: "/tmp/responses/crm_taxonomy_refresh_response.json",
    },
  ],
  finalResponseState: {
    brand: {
      path: "/tmp/responses/brand_taxonomy_refresh_response.json",
      exists: false,
      accepted: false,
      unsafe: false,
      status: "awaiting_final_response_file",
      missing: ["final_response_file"],
    },
    crm: {
      path: "/tmp/responses/crm_taxonomy_refresh_response.json",
      exists: false,
      accepted: false,
      unsafe: false,
      status: "awaiting_final_response_file",
      missing: ["final_response_file"],
    },
  },
  pendingResponseState: {
    brand: {
      path: "/tmp/responses/brand_taxonomy_refresh_response.pending.json",
      unsafe: false,
      readyToFinalize: false,
      status: "incomplete_brand_taxonomy_response",
    },
    crm: {
      path: "/tmp/responses/crm_taxonomy_refresh_response.pending.json",
      unsafe: false,
      readyToFinalize: false,
      status: "incomplete_crm_taxonomy_response",
    },
  },
  commands: {
    rescanFinalResponses: "npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace -- --no-write-pending",
  },
};

const decisionIntake = {
  status: "taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes",
  brandDecisionState: {
    status: "missing_no_live_changes",
    blockers: ["brand_decision_file_missing"],
    unsafe: false,
  },
  crmDecisionState: {
    status: "missing_no_live_changes",
    blockers: ["crm_decision_file_missing"],
    unsafe: false,
  },
};

describe("CRM vNext MailerLite Launch OS taxonomy response request bundle", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/taxonomy-response-request.json",
      "--markdown-out",
      "/tmp/taxonomy-response-request.md",
    ]);

    expect(parsed.taxonomyRefreshHandoff).toContain("mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json");
    expect(parsed.taxonomyRefreshResponseWorkspace).toContain("mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json");
    expect(parsed.taxonomyRefreshDecisionIntake).toContain("mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/taxonomy-response-request.json");
    expect(parsed.markdownOut).toBe("/tmp/taxonomy-response-request.md");
  });

  test("builds copy-ready Brand and CRM response requests without approval or file creation", () => {
    const bundle = buildTaxonomyRefreshResponseRequestBundle({
      taxonomyRefreshHandoff: handoff,
      taxonomyRefreshResponseWorkspace: responseWorkspace,
      taxonomyRefreshDecisionIntake: decisionIntake,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(bundle.status).toBe("taxonomy_refresh_response_request_bundle_ready_no_live_changes");
    expect(bundle.executiveSummary.requestCount).toBe(2);
    expect(bundle.executiveSummary.pendingActors).toEqual(["brand", "crm"]);
    expect(bundle.executiveSummary.missingFinalResponseActors).toEqual(["brand", "crm"]);
    expect(bundle.executiveSummary.copyBlocksReady).toBe(true);
    expect(bundle.executiveSummary.asksApproval).toBe(false);
    expect(bundle.executiveSummary.asksLiveApproval).toBe(false);
    expect(bundle.executiveSummary.createsFinalResponseFiles).toBe(false);
    expect(bundle.executiveSummary.canApplyCrmManifestPatchNow).toBe(false);
    expect(bundle.executiveSummary.openLiveMutationGateCount).toBe(0);
    expect(bundle.safety).toMatchObject({
      localOnly: true,
      createsFinalResponseFiles: false,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("request text distinguishes pending working copies from final responses", () => {
    const bundle = buildTaxonomyRefreshResponseRequestBundle({
      taxonomyRefreshHandoff: handoff,
      taxonomyRefreshResponseWorkspace: responseWorkspace,
      taxonomyRefreshDecisionIntake: decisionIntake,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const serialized = JSON.stringify(bundle.requests);

    expect(serialized).toContain("brand_taxonomy_refresh_response.pending.json");
    expect(serialized).toContain("brand_taxonomy_refresh_response.json");
    expect(serialized).toContain("crm_taxonomy_refresh_response.pending.json");
    expect(serialized).toContain("crm_taxonomy_refresh_response.json");
    expect(serialized).toContain("applyNow debe ser false");
    expect(serialized).toContain("canApplyCrmManifestPatchNow debe ser false");
    expect(serialized).not.toContain("executeNow");
    expect(serialized).not.toContain("sendNow");
  });

  test("renders markdown with hard stops and no-live commands", () => {
    const bundle = buildTaxonomyRefreshResponseRequestBundle({
      taxonomyRefreshHandoff: handoff,
      taxonomyRefreshResponseWorkspace: responseWorkspace,
      taxonomyRefreshDecisionIntake: decisionIntake,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(bundle);

    expect(markdown).toContain("Taxonomy Response Request Bundle");
    expect(markdown).toContain("Copy-Ready Requests");
    expect(markdown).toContain("This request bundle is not approval");
    expect(markdown).toContain("Final responses do not apply Brand dictionary or CRM manifest patches");
    expect(markdown).toContain("crm:vnext:mailerlite-launch-os-taxonomy-refresh-decision-intake");
    expect(buildSafety()).toMatchObject({
      asksLiveApproval: false,
      groupMutationsPerformed: false,
      createsFinalResponseFiles: false,
    });
  });
});
