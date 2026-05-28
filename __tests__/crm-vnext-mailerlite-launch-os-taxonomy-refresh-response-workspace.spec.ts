import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildCommands,
  buildResponseWorkspace,
  buildSafety,
  finalPathFor,
  parseArgs,
  pendingPathFor,
  renderMarkdown,
  validateResponse,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-workspace.mjs";

const handoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  generatedAt: "2026-05-28T00:00:00.000Z",
  executiveSummary: {
    brandPromotionDecisionCount: 1,
    crmManifestPatchCount: 1,
  },
  brandPromotionRows: [
    {
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      currentBrandStatus: "proposed_local",
      requestedBrandStatus: "live_canonical",
    },
  ],
  crmManifestPatchRows: [
    {
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      currentCrmManifestLiveGroupId: null,
      currentCrmManifestLiveStatus: null,
      requestedCrmManifestLiveGroupId: "188667906749367606",
      requestedCrmManifestLiveStatus: "live_canonical_empty_created_2026-05-28",
      reasonToHoldApply: "Brand dictionary has not yet promoted this row to live_canonical.",
    },
  ],
};

const tmpResponsesDir = async () => mkdtemp(join(tmpdir(), "taxonomy-refresh-responses-"));

const safe = buildSafety();

describe("CRM vNext MailerLite Launch OS taxonomy refresh response workspace", () => {
  test("normalizes args and response paths", () => {
    const parsed = parseArgs([
      "--taxonomy-refresh-handoff",
      "/tmp/handoff.json",
      "--responses-dir",
      "/tmp/responses",
      "--overwrite-pending",
      "--no-write-pending",
      "--out",
      "/tmp/workspace.json",
      "--markdown-out",
      "/tmp/workspace.md",
    ]);

    expect(parsed.taxonomyRefreshHandoff).toBe("/tmp/handoff.json");
    expect(parsed.responsesDir).toBe("/tmp/responses");
    expect(parsed.overwritePending).toBe(true);
    expect(parsed.writePending).toBe(false);
    expect(pendingPathFor("/tmp/responses", "brand")).toBe("/tmp/responses/brand_taxonomy_refresh_response.pending.json");
    expect(finalPathFor("/tmp/responses", "crm")).toBe("/tmp/responses/crm_taxonomy_refresh_response.json");
  });

  test("writes pending working copies without treating them as final responses", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspace = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(workspace.status).toBe("taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(workspace.executiveSummary).toMatchObject({
      brandDecisionRowCount: 1,
      crmManifestPatchRowCount: 1,
      acceptedActorCount: 0,
      pendingActorCount: 2,
      readyForIntake: false,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(workspace.workingCopies.every((copy) => copy.written)).toBe(true);
    expect(workspace.workingCopies.every((copy) => copy.pendingFileIsAcceptedByWorkspace === false)).toBe(true);

    const brandPending = JSON.parse(await readFile(join(responsesDir, "brand_taxonomy_refresh_response.pending.json"), "utf8"));
    expect(brandPending.workspaceStatus).toBe("pending_working_copy_not_final_response");
    expect(brandPending.decisions[0].decision).toBe("pending");
    await expect(readFile(join(responsesDir, "brand_taxonomy_refresh_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(workspace.safety).toMatchObject({
      brandDictionaryMutated: false,
      crmManifestMutated: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
    });
  });

  test("preserves pending working copies unless overwrite is explicit", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_taxonomy_refresh_response.pending.json"), JSON.stringify({ custom: true }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const preserved = JSON.parse(await readFile(join(responsesDir, "brand_taxonomy_refresh_response.pending.json"), "utf8"));

    expect(preserved.custom).toBe(true);
    expect(workspace.workingCopies.find((copy) => copy.actor === "brand")).toMatchObject({
      written: false,
      existedBefore: true,
      preservedExisting: true,
    });
  });

  test("accepts complete final Brand and CRM responses but still keeps apply gates closed", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspaceWithTemplates = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    await writeFile(join(responsesDir, "brand_taxonomy_refresh_response.json"), JSON.stringify({
      ...workspaceWithTemplates.templates.brand,
      workspaceStatus: "final_response",
      decisions: [
        {
          ...workspaceWithTemplates.templates.brand.decisions[0],
          decision: "promote_to_live_canonical",
          finalBrandStatus: "live_canonical",
        },
      ],
    }, null, 2), "utf8");
    await writeFile(join(responsesDir, "crm_taxonomy_refresh_response.json"), JSON.stringify({
      ...workspaceWithTemplates.templates.crm,
      workspaceStatus: "final_response",
      canApplyCrmManifestPatchNow: false,
      patchRows: [
        {
          ...workspaceWithTemplates.templates.crm.patchRows[0],
          decision: "prepare_local_manifest_patch_after_brand",
          applyNow: false,
        },
      ],
    }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(workspace.status).toBe("taxonomy_refresh_response_workspace_ready_for_intake_no_live_changes");
    expect(workspace.acceptedActors).toEqual(["brand", "crm"]);
    expect(workspace.executiveSummary.readyForIntake).toBe(true);
    expect(workspace.executiveSummary.canApplyBrandDictionaryPatchNow).toBe(false);
    expect(workspace.executiveSummary.canApplyCrmManifestPatchNow).toBe(false);
    expect(workspace.finalResponseState.crm).toMatchObject({
      status: "accepted_no_live_crm_taxonomy_response",
      accepted: true,
      unsafe: false,
    });
  });

  test("detects unsafe CRM final response that tries to apply now", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspaceWithTemplates = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    await writeFile(join(responsesDir, "crm_taxonomy_refresh_response.json"), JSON.stringify({
      ...workspaceWithTemplates.templates.crm,
      canApplyCrmManifestPatchNow: true,
      patchRows: [
        {
          ...workspaceWithTemplates.templates.crm.patchRows[0],
          decision: "prepare_local_manifest_patch_after_brand",
          applyNow: true,
        },
      ],
    }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(workspace.status).toBe("blocked_by_invalid_or_unsafe_taxonomy_final_response_no_live_changes");
    expect(workspace.finalResponseState.crm).toMatchObject({
      status: "unsafe_crm_taxonomy_response_blocked",
      accepted: false,
      unsafe: true,
    });
    expect(workspace.finalResponseState.crm.missing).toContain("can_apply_crm_manifest_patch_now_must_be_false");
    expect(workspace.finalResponseState.crm.missing).toContain("apply_now_must_be_false:CC · Source · IG onboarding");
  });

  test("renders commands and safety posture", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspace = await buildResponseWorkspace({
      handoff,
      responsesDir,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(workspace);
    const commands = buildCommands({ responsesDir });

    expect(commands.refreshWorkspace).toContain("taxonomy-refresh-response-workspace");
    expect(markdown).toContain("Taxonomy Refresh Response Workspace");
    expect(markdown).toContain("Can apply CRM manifest patch now: false");
    expect(markdown).toContain("Open live mutation gates: 0");
    expect(markdown).toContain("CRM manifest mutated: false");
    expect(validateResponse({
      actor: "brand",
      response: workspace.templates.brand,
      template: workspace.templates.brand,
    }).status).toBe("incomplete_brand_taxonomy_response");
    expect(safe).toMatchObject({ outboundPerformed: false });
  });
});
