import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  buildDraftAssist,
  buildDraftResponses,
  buildSafety,
  draftPathFor,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-draft-assist.mjs";
import { validateResponse } from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-intake.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const tmpDraftsDir = async () => mkdtemp(join(tmpdir(), "mailerlite-review-draft-assist-"));

const responseWorkspace = (responsesDir: string) => ({
  launch,
  responsesDir,
  workingCopies: [
    {
      department: "brand",
      finalResponsePath: join(responsesDir, "brand_response.json"),
    },
    {
      department: "web_design",
      finalResponsePath: join(responsesDir, "web_design_response.json"),
    },
    {
      department: "crm",
      finalResponsePath: join(responsesDir, "crm_response.json"),
    },
  ],
});

const brandCandidate = {
  launch,
  candidateRows: [
    { name: "CC · Source · Quiz · Inteligencia para descansar" },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
};

const emailSequence = {
  launch,
};

const shopifyHandoff = {
  launch,
  suggestedShopifyFiles: [
    { path: "sections/landing-inteligencia-para-descansar.liquid" },
    { path: "templates/page.landing-inteligencia-para-descansar.json" },
  ],
};

const eventContract = {
  launch,
  eventContract: [
    {
      eventKind: "mini_launch_intake_created",
      projectionPosture: "store_only_no_projection",
    },
    {
      eventKind: "resource_delivered",
      projectionPosture: "store_only_no_projection",
    },
    {
      eventKind: "email_open",
      projectionPosture: "projects_to_engagement_preview",
    },
  ],
};

const brandTemplate = {
  schemaVersion: "crm-vnext-mailerlite-mini-launch-department-review-response-2026-05-27",
  department: "brand",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  sequenceDecision: "pending",
  groupDecisions: brandCandidate.candidateRows.map((candidate) => ({
    name: candidate.name,
    decision: "pending",
    proposedName: null,
    notes: [],
  })),
  blockers: [],
  nextSafeStep: null,
};

describe("CRM vNext MailerLite department review draft assist", () => {
  test("normalizes default args and overwrite flag", () => {
    const parsed = parseArgs([
      "--drafts-dir",
      "/tmp/drafts",
      "--overwrite-drafts",
      "--out",
      "/tmp/draft-assist.json",
      "--markdown-out",
      "/tmp/draft-assist.md",
    ]);

    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.emailSequence).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.draftsDir).toBe("/tmp/drafts");
    expect(parsed.overwriteDrafts).toBe(true);
    expect(parsed.out).toBe("/tmp/draft-assist.json");
  });

  test("builds draft responses that cannot be accepted as final intake responses", async () => {
    const responsesDir = await tmpDraftsDir();
    const workspace = responseWorkspace(responsesDir);
    const drafts = buildDraftResponses({
      workspace,
      emailSequence,
      brandCandidate,
      shopifyHandoff,
      eventContract,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(drafts.brand.reviewMode).toBe("draft_no_live_review");
    expect(drafts.brand.liveApprovalGranted).toBe(false);
    expect(drafts.brand.codexDraftMeta.acceptedByIntake).toBe(false);
    expect(drafts.brand.groupDecisions.map((item) => item.decision)).toEqual([
      "add_as_candidate",
      "add_as_candidate",
    ]);
    expect(drafts.web_design.proposedLocalBuildFiles).toContain("sections/landing-inteligencia-para-descansar.liquid");
    expect(drafts.crm.storeOnlyEvents).toEqual(["mini_launch_intake_created", "resource_delivered"]);
    expect(drafts.crm.projectableLaterEvents).toEqual(["email_open"]);

    const validation = validateResponse({
      department: "brand",
      response: drafts.brand,
      template: brandTemplate,
    });
    expect(validation.accepted).toBe(false);
    expect(validation.status).toBe("unsafe_response_blocked");
    expect(validation.missing).toContain("reviewMode");
    expect(validation.unsafeReasons).toContain("codexDraftMeta_must_not_be_present_in_final_response");

    const copiedWithReviewModeChanged = validateResponse({
      department: "brand",
      response: {
        ...drafts.brand,
        reviewMode: "no_live_review",
      },
      template: brandTemplate,
    });
    expect(copiedWithReviewModeChanged.accepted).toBe(false);
    expect(copiedWithReviewModeChanged.status).toBe("unsafe_response_blocked");
    expect(copiedWithReviewModeChanged.unsafeReasons).toContain("codexDraftMeta_must_not_be_present_in_final_response");
  });

  test("writes only codex draft files and never final responses", async () => {
    const responsesDir = await tmpDraftsDir();
    const draftsDir = await tmpDraftsDir();
    const report = await buildDraftAssist({
      responseWorkspace: responseWorkspace(responsesDir),
      emailSequence,
      brandCandidate,
      shopifyHandoff,
      eventContract,
      readinessBoard: { launch },
      draftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(report.status).toBe("department_review_codex_drafts_ready_not_final_no_live_changes");
    expect(report.draftFiles.map((file) => file.department)).toEqual(["brand", "web_design", "crm"]);
    expect(report.draftFiles.every((file) => file.draftPath.endsWith(".codex_draft.json"))).toBe(true);
    expect(report.draftFiles.every((file) => file.written)).toBe(true);
    expect(report.draftFiles.every((file) => file.acceptedByIntake === false)).toBe(true);

    const brandDraft = JSON.parse(await readFile(join(draftsDir, "brand_response.codex_draft.json"), "utf8"));
    expect(brandDraft.reviewMode).toBe("draft_no_live_review");
    await expect(readFile(join(responsesDir, "brand_response.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(report.safety).toMatchObject({
      localOnly: true,
      finalResponsesWritten: false,
      mailerLiteApiCalled: false,
      subscriberMutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("preserves existing codex draft files unless overwrite is explicit", async () => {
    const responsesDir = await tmpDraftsDir();
    const draftsDir = await tmpDraftsDir();
    const existingPath = draftPathFor(draftsDir, "brand");
    await writeFile(existingPath, JSON.stringify({ custom: "keep me" }, null, 2), "utf8");

    const report = await buildDraftAssist({
      responseWorkspace: responseWorkspace(responsesDir),
      emailSequence,
      brandCandidate,
      shopifyHandoff,
      eventContract,
      readinessBoard: { launch },
      draftsDir,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const preserved = JSON.parse(await readFile(existingPath, "utf8"));

    expect(preserved.custom).toBe("keep me");
    expect(report.draftFiles.find((file) => file.department === "brand")).toMatchObject({
      written: false,
      existedBefore: true,
      preservedExisting: true,
    });
  });

  test("renders markdown with hard stops and safety posture", async () => {
    const responsesDir = await tmpDraftsDir();
    const draftsDir = await tmpDraftsDir();
    const report = await buildDraftAssist({
      responseWorkspace: responseWorkspace(responsesDir),
      emailSequence,
      brandCandidate,
      shopifyHandoff,
      eventContract,
      readinessBoard: { launch },
      draftsDir,
      sourceDigests: [
        {
          path: "/tmp/source.json",
          consultedFor: "test source",
        },
      ],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Draft Assist");
    expect(markdown).toContain("No son respuestas finales");
    expect(markdown).toContain("Do not pass *.codex_draft.json files to intake");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
    expect(buildSafety()).toMatchObject({
      draftFilesOnly: true,
      finalResponsesWritten: false,
      outboundPerformed: false,
    });
  });
});
