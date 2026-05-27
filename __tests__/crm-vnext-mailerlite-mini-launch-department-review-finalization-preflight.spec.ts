import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  buildFinalizationPreflight,
  buildSafety,
  inspectCandidate,
  parseArgs,
  renderMarkdown,
  statusFor,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-finalization-preflight.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const responseSchema = "crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27";

const templates = {
  brand: {
    schemaVersion: responseSchema,
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
    schemaVersion: responseSchema,
    department: "web_design",
    launchId: launch.launchId,
    reviewMode: "no_live_review",
    liveApprovalGranted: false,
    handoffDecision: "pending",
    blockers: [],
    nextSafeStep: null,
  },
  crm: {
    schemaVersion: responseSchema,
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

const acceptedBrand = {
  ...templates.brand,
  sequenceDecision: "approve",
  groupDecisions: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      decision: "add_as_candidate",
      proposedName: null,
      notes: [],
    },
  ],
};

const acceptedWeb = {
  ...templates.web_design,
  handoffDecision: "sufficient_for_local_draft",
};

const acceptedCrm = {
  ...templates.crm,
  signalBoundaryDecision: "approve",
  onboardingProtectionStatus: "protected",
};

const tmpDir = async () => mkdtemp(join(tmpdir(), "mailerlite-finalization-preflight-"));

const writeJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const makeWorkspace = async () => {
  const root = await tmpDir();
  const responsesDir = join(root, "responses");
  const codexDraftsDir = join(root, "codex-drafts");
  const templatesDir = join(root, "templates");

  await Promise.all([
    writeJson(join(templatesDir, "brand_response_template.json"), templates.brand),
    writeJson(join(templatesDir, "web_design_response_template.json"), templates.web_design),
    writeJson(join(templatesDir, "crm_response_template.json"), templates.crm),
  ]);

  const workspace = {
    launch,
    workingCopies: [
      {
        department: "brand",
        pendingPath: join(responsesDir, "brand_response.pending.json"),
        finalResponsePath: join(responsesDir, "brand_response.json"),
        templateSourcePath: join(templatesDir, "brand_response_template.json"),
      },
      {
        department: "web_design",
        pendingPath: join(responsesDir, "web_design_response.pending.json"),
        finalResponsePath: join(responsesDir, "web_design_response.json"),
        templateSourcePath: join(templatesDir, "web_design_response_template.json"),
      },
      {
        department: "crm",
        pendingPath: join(responsesDir, "crm_response.pending.json"),
        finalResponsePath: join(responsesDir, "crm_response.json"),
        templateSourcePath: join(templatesDir, "crm_response_template.json"),
      },
    ],
  };

  return {
    root,
    responsesDir,
    codexDraftsDir,
    workspace,
  };
};

describe("CRM vNext MailerLite department response finalization preflight", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--responses-dir",
      "/tmp/responses",
      "--codex-drafts-dir",
      "/tmp/drafts",
      "--out",
      "/tmp/preflight.json",
      "--markdown-out",
      "/tmp/preflight.md",
    ]);

    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responsesDir).toBe("/tmp/responses");
    expect(parsed.codexDraftsDir).toBe("/tmp/drafts");
    expect(parsed.out).toBe("/tmp/preflight.json");
  });

  test("reports draft assists as useful but not final", async () => {
    const { responsesDir, codexDraftsDir, workspace } = await makeWorkspace();
    await writeJson(join(codexDraftsDir, "brand_response.codex_draft.json"), {
      ...acceptedBrand,
      reviewMode: "draft_no_live_review",
      codexDraftMeta: { draftOnly: true },
    });

    const report = await buildFinalizationPreflight({
      responseWorkspace: workspace,
      responsesDir,
      codexDraftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("department_finalization_preflight_waiting_department_responses_no_live_changes");
    expect(report.readyForIntake).toBe(false);
    expect(report.draftAssistDepartments).toEqual(["brand"]);
    expect(report.awaitingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(report.departments.find((department) => department.department === "brand")?.state).toBe("draft_assist_available_needs_department_review");
    expect(report.safety).toMatchObject({
      localOnly: true,
      finalResponsesWritten: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("detects pending responses ready to finalize without writing final files", async () => {
    const { responsesDir, codexDraftsDir, workspace } = await makeWorkspace();
    await writeJson(join(responsesDir, "brand_response.pending.json"), acceptedBrand);

    const report = await buildFinalizationPreflight({
      responseWorkspace: workspace,
      responsesDir,
      codexDraftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("department_finalization_preflight_has_pending_ready_to_finalize_no_live_changes");
    expect(report.pendingReadyDepartments).toEqual(["brand"]);
    expect(report.departments.find((department) => department.department === "brand")?.pendingCanBecomeFinal).toBe(true);
  });

  test("accepts only final response files as ready for intake", async () => {
    const { responsesDir, codexDraftsDir, workspace } = await makeWorkspace();
    await Promise.all([
      writeJson(join(responsesDir, "brand_response.json"), acceptedBrand),
      writeJson(join(responsesDir, "web_design_response.json"), acceptedWeb),
      writeJson(join(responsesDir, "crm_response.json"), acceptedCrm),
    ]);

    const report = await buildFinalizationPreflight({
      responseWorkspace: workspace,
      responsesDir,
      codexDraftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("department_final_responses_ready_for_intake_no_live_changes");
    expect(report.readyForIntake).toBe(true);
    expect(report.acceptedDepartments).toEqual(["brand", "web_design", "crm"]);
  });

  test("blocks unsafe final responses with copied Codex metadata", () => {
    const candidate = inspectCandidate({
      department: "brand",
      kind: "final",
      template: templates.brand,
      readState: {
        path: "/tmp/brand_response.json",
        exists: true,
        error: null,
        value: {
          ...acceptedBrand,
          codexDraftMeta: { draftOnly: true },
        },
      },
    });

    expect(candidate.status).toBe("unsafe_response_blocked");
    expect(candidate.acceptedByIntake).toBe(false);
    expect(candidate.blockers).toContain("unsafe:codexDraftMeta_must_not_be_present_in_final_response");
  });

  test("renders operator-readable markdown and exposes status helper", async () => {
    const { responsesDir, codexDraftsDir, workspace } = await makeWorkspace();
    const report = await buildFinalizationPreflight({
      responseWorkspace: workspace,
      responsesDir,
      codexDraftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Finalization Preflight");
    expect(markdown).toContain("Ready for intake: false");
    expect(markdown).toContain("Solo reportes; no escribe respuestas finales");
    expect(statusFor([
      { acceptedFinalResponse: true, candidates: { final: { status: "accepted_final_response_ready_for_intake" } } },
      { acceptedFinalResponse: true, candidates: { final: { status: "accepted_final_response_ready_for_intake" } } },
      { acceptedFinalResponse: true, candidates: { final: { status: "accepted_final_response_ready_for_intake" } } },
    ])).toBe("department_final_responses_ready_for_intake_no_live_changes");
    expect(buildSafety().finalResponsesWritten).toBe(false);
  });
});
