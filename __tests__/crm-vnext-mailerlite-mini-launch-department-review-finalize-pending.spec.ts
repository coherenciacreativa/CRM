import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  buildFinalizePending,
  buildSafety,
  cleanFinalResponse,
  parseArgs,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-finalize-pending.mjs";

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

const readyBrandResponse = {
  ...responseTemplates.brand,
  sequenceDecision: "approve",
  groupDecisions: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      decision: "add_as_candidate",
      proposedName: null,
      notes: ["Semantic candidate only; no MailerLite creation approval."],
    },
  ],
  workspaceStatus: "pending_working_copy_not_final_response",
  workspaceInstructions: ["working copy"],
  workspaceMeta: {
    pendingFileIsNotAcceptedByIntake: true,
  },
};

const tmpResponsesDir = async () => mkdtemp(join(tmpdir(), "mailerlite-finalize-pending-"));

describe("CRM vNext MailerLite department review finalize pending", () => {
  test("normalizes args and department alias", () => {
    const parsed = parseArgs([
      "--responses-dir",
      "/tmp/responses",
      "--department",
      "web",
      "--write",
      "--approved-by",
      "Brand reviewer",
      "--overwrite-final",
      "--out",
      "/tmp/finalize.json",
      "--markdown-out",
      "/tmp/finalize.md",
    ]);

    expect(parsed.intakeBoard).toContain("mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responsesDir).toBe("/tmp/responses");
    expect(parsed.department).toBe("web_design");
    expect(parsed.write).toBe(true);
    expect(parsed.approvedBy).toBe("Brand reviewer");
    expect(parsed.overwriteFinal).toBe(true);
  });

  test("reports incomplete pending responses without writing final files", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify(responseTemplates.brand, null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("pending_responses_not_ready_to_finalize_no_live_changes");
    expect(report.results[0]).toMatchObject({
      department: "brand",
      status: "pending_response_not_ready_to_finalize_no_live_changes",
      readyToFinalize: false,
      written: false,
    });
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("dry-run marks a valid pending response as ready but does not finalize", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify(readyBrandResponse, null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("pending_responses_ready_to_finalize_no_live_changes");
    expect(report.readyDepartments).toEqual(["brand"]);
    expect(report.writtenDepartments).toEqual([]);
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("write mode requires approvedBy before creating final response files", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify(readyBrandResponse, null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      write: true,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("pending_finalization_blocked_no_live_changes");
    expect(report.blockedDepartments).toEqual(["brand"]);
    expect(report.results[0].blockers).toContain("approved_by_required_for_write");
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("writes a clean final response only after valid pending response and explicit reviewer confirmation", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify(readyBrandResponse, null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      write: true,
      approvedBy: "Brand reviewer",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const finalResponse = JSON.parse(await readFile(join(responsesDir, "brand_response.json"), "utf8"));

    expect(report.status).toBe("pending_responses_finalized_no_live_changes");
    expect(report.writtenDepartments).toEqual(["brand"]);
    expect(report.results[0].removedWorkspaceFields).toEqual([
      "workspaceStatus",
      "workspaceInstructions",
      "workspaceMeta",
    ]);
    expect(finalResponse.workspaceStatus).toBeUndefined();
    expect(finalResponse.workspaceInstructions).toBeUndefined();
    expect(finalResponse.workspaceMeta).toBeUndefined();
    expect(finalResponse.reviewMode).toBe("no_live_review");
    expect(finalResponse.liveApprovalGranted).toBe(false);
  });

  test("blocks copied Codex draft metadata even when reviewMode was changed", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify({
      ...readyBrandResponse,
      codexDraftMeta: {
        draftOnly: true,
        acceptedByIntake: false,
      },
    }, null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      write: true,
      approvedBy: "Brand reviewer",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("pending_finalization_blocked_no_live_changes");
    expect(report.results[0].status).toBe("blocked_unsafe_pending_response_no_live_changes");
    expect(report.results[0].blockers).toContain("codexDraftMeta_must_not_be_present_in_final_response");
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("blocks overwriting an existing final response unless explicitly allowed", async () => {
    const responsesDir = await tmpResponsesDir();
    await writeFile(join(responsesDir, "brand_response.pending.json"), JSON.stringify(readyBrandResponse, null, 2), "utf8");
    await writeFile(join(responsesDir, "brand_response.json"), JSON.stringify(cleanFinalResponse(readyBrandResponse), null, 2), "utf8");

    const report = await buildFinalizePending({
      intakeBoard,
      responsesDir,
      department: "brand",
      write: true,
      approvedBy: "Brand reviewer",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("pending_finalization_blocked_no_live_changes");
    expect(report.results[0].status).toBe("blocked_final_response_already_exists_no_live_changes");
    expect(report.results[0].blockers).toContain("final_response_already_exists");
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
