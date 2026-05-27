import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  buildCommands,
  buildPendingDraftState,
  buildPendingWorkingCopy,
  buildResponseWorkspace,
  buildSafety,
  finalPathFor,
  parseArgs,
  pendingPathFor,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-response-workspace.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const responseTemplates = {
  brand: {
    schemaVersion: "crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27",
    department: "brand",
    launchId: launch.launchId,
    reviewMode: "no_live_review",
    liveApprovalGranted: false,
    sequenceDecision: "pending",
    groupDecisions: [
      {
        name: "CC · Source · Quiz · Inteligencia para descansar",
        decision: "pending",
        proposedName: null,
        notes: [],
      },
    ],
    blockers: [],
    nextSafeStep: null,
  },
  web_design: {
    schemaVersion: "crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27",
    department: "web_design",
    launchId: launch.launchId,
    reviewMode: "no_live_review",
    liveApprovalGranted: false,
    handoffDecision: "pending",
    blockers: [],
    nextSafeStep: null,
  },
  crm: {
    schemaVersion: "crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27",
    department: "crm",
    launchId: launch.launchId,
    reviewMode: "no_live_review",
    liveApprovalGranted: false,
    signalBoundaryDecision: "pending",
    onboardingProtectionStatus: "pending",
    blockers: [],
    nextSafeStep: null,
  },
};

const intakeBoard = {
  launch,
  responseTemplates,
};

const deliveryPack = {
  launch,
  deliveries: [
    {
      department: "brand",
      responseTemplate: "/tmp/templates/brand_response_template.json",
      expectedResponsePath: "/tmp/responses/brand_response.json",
      packetJson: "/tmp/brand_packet.json",
    },
    {
      department: "web_design",
      responseTemplate: "/tmp/templates/web_design_response_template.json",
      expectedResponsePath: "/tmp/responses/web_design_response.json",
      packetJson: "/tmp/web_packet.json",
    },
    {
      department: "crm",
      responseTemplate: "/tmp/templates/crm_response_template.json",
      expectedResponsePath: "/tmp/responses/crm_response.json",
      packetJson: "/tmp/crm_packet.json",
    },
  ],
};

const tmpResponsesDir = async () => mkdtemp(join(tmpdir(), "mailerlite-response-workspace-"));

describe("CRM vNext MailerLite department review response workspace", () => {
  test("normalizes default args and workspace flags", () => {
    const parsed = parseArgs([
      "--responses-dir",
      "/tmp/responses",
      "--overwrite-pending",
      "--no-write-pending",
      "--out",
      "/tmp/workspace.json",
      "--markdown-out",
      "/tmp/workspace.md",
    ]);

    expect(parsed.deliveryPack).toContain("mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(parsed.intakeBoard).toContain("mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responsesDir).toBe("/tmp/responses");
    expect(parsed.overwritePending).toBe(true);
    expect(parsed.writePending).toBe(false);
    expect(parsed.out).toBe("/tmp/workspace.json");
  });

  test("derives pending and final response paths separately", () => {
    expect(pendingPathFor("/tmp/responses", "brand")).toBe("/tmp/responses/brand_response.pending.json");
    expect(finalPathFor("/tmp/responses", "crm")).toBe("/tmp/responses/crm_response.json");
  });

  test("builds pending working copy that cannot count as final approval", () => {
    const finalResponsePath = "/tmp/responses/brand_response.json";
    const copy = buildPendingWorkingCopy({
      department: "brand",
      template: responseTemplates.brand,
      finalResponsePath,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(copy.reviewMode).toBe("no_live_review");
    expect(copy.liveApprovalGranted).toBe(false);
    expect(copy.sequenceDecision).toBe("pending");
    expect(copy.workspaceStatus).toBe("pending_working_copy_not_final_response");
    expect(copy.workspaceMeta.pendingFileIsNotAcceptedByIntake).toBe(true);
  });

  test("writes only pending working copies, never final response files", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(workspace.status).toBe("department_review_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(workspace.readyForIntake).toBe(false);
    expect(workspace.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(workspace.readyPendingDepartments).toEqual([]);
    expect(workspace.workingCopies.every((copy) => copy.written)).toBe(true);
    expect(workspace.workingCopies.every((copy) => copy.pendingFileIsAcceptedByIntake === false)).toBe(true);

    const brandPending = JSON.parse(await readFile(join(responsesDir, "brand_response.pending.json"), "utf8"));
    expect(brandPending.workspaceStatus).toBe("pending_working_copy_not_final_response");
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(workspace.liveGateSummary.openLiveGateCount).toBe(0);
    expect(workspace.pendingDraftState.brand).toMatchObject({
      status: "incomplete_response",
      readyToFinalize: false,
      pendingFileIsFinalResponse: false,
    });
    expect(workspace.safety).toMatchObject({
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("preserves existing pending working copies unless overwrite is explicit", async () => {
    const responsesDir = await tmpResponsesDir();
    const existingPath = join(responsesDir, "brand_response.pending.json");
    await writeFile(existingPath, JSON.stringify({ custom: "keep me" }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const preserved = JSON.parse(await readFile(existingPath, "utf8"));

    expect(preserved.custom).toBe("keep me");
    expect(workspace.workingCopies.find((copy) => copy.department === "brand")).toMatchObject({
      written: false,
      existedBefore: true,
      preservedExisting: true,
    });
  });

  test("recognizes complete final responses as ready for intake", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.json"), JSON.stringify({
      ...responseTemplates.brand,
      sequenceDecision: "approve",
      groupDecisions: [
        {
          name: "CC · Source · Quiz · Inteligencia para descansar",
          decision: "add_as_candidate",
          proposedName: null,
          notes: [],
        },
      ],
    }, null, 2), "utf8");
    await writeFile(join(responsesDir, "web_design_response.json"), JSON.stringify({
      ...responseTemplates.web_design,
      handoffDecision: "sufficient_for_local_draft",
    }, null, 2), "utf8");
    await writeFile(join(responsesDir, "crm_response.json"), JSON.stringify({
      ...responseTemplates.crm,
      signalBoundaryDecision: "approve",
      onboardingProtectionStatus: "protected",
    }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(workspace.status).toBe("department_review_response_workspace_ready_for_intake_no_live_changes");
    expect(workspace.readyForIntake).toBe(true);
    expect(workspace.acceptedDepartments).toEqual(["brand", "web_design", "crm"]);
  });

  test("detects complete pending drafts without treating them as final responses", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify({
      ...responseTemplates.brand,
      sequenceDecision: "approve",
      groupDecisions: [
        {
          name: "CC · Source · Quiz · Inteligencia para descansar",
          decision: "add_as_candidate",
          proposedName: null,
          notes: [],
        },
      ],
    }, null, 2), "utf8");

    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(workspace.status).toBe("department_review_response_workspace_has_ready_pending_drafts_no_live_changes");
    expect(workspace.readyForIntake).toBe(false);
    expect(workspace.readyPendingDepartments).toEqual(["brand"]);
    expect(workspace.pendingDraftState.brand).toMatchObject({
      status: "accepted_no_live_review_response",
      readyToFinalize: true,
      pendingFileIsFinalResponse: false,
    });
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("reports invalid pending drafts as local blockers", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "crm_response.pending.json"), "{not-json", "utf8");

    const pendingState = await buildPendingDraftState({
      responsesDir,
      templates: responseTemplates,
    });
    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(pendingState.crm.status).toBe("invalid_json_pending_working_copy_blocked");
    expect(workspace.status).toBe("blocked_by_invalid_pending_draft_no_live_changes");
    expect(workspace.liveGateSummary.openLiveGateCount).toBe(0);
  });

  test("renders commands, rules and safety posture", async () => {
    const responsesDir = await tmpResponsesDir();
    const workspace = await buildResponseWorkspace({
      deliveryPack,
      intakeBoard,
      responsesDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(workspace);
    const commands = buildCommands({ responsesDir });

    expect(commands.createWorkspace).toContain("department-review-response-workspace");
    expect(markdown).toContain("Department Review Response Workspace");
    expect(markdown).toContain("Pending working copy");
    expect(markdown).toContain("Pending Draft State");
    expect(markdown).toContain("Final response path");
    expect(markdown).toContain("Open live gates: 0");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
    expect(buildSafety()).toMatchObject({ outboundPerformed: false });
  });
});
