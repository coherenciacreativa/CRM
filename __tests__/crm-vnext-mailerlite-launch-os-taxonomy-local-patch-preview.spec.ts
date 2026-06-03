import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildTaxonomyLocalPatchPreview,
  buildTaxonomyLocalPatchPreviewFromFiles,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-local-patch-preview.mjs";

const handoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  brandPromotionRows: [
    {
      name: "CC · Source · IG onboarding",
      sourceId: "onboarding_v2_empty_groups",
      liveGroupId: "188667906749367606",
      currentBrandStatus: "proposed_local",
      requestedBrandStatus: "live_canonical",
    },
  ],
  crmManifestPatchRows: [
    {
      name: "CC · Source · IG onboarding",
      sourceId: "onboarding_v2_empty_groups",
      liveGroupId: "188667906749367606",
      requestedCrmManifestLiveGroupId: "188667906749367606",
      requestedCrmManifestLiveStatus: "live_canonical_empty_created_2026-05-28",
    },
  ],
};

const readyDecisionIntake = {
  status: "taxonomy_refresh_decision_intake_ready_for_local_patch_preview_no_live_changes",
  executiveSummary: {
    readyForLocalPatchPreview: true,
  },
  brandDecisionState: {
    decisions: [
      {
        name: "CC · Source · IG onboarding",
        sourceId: "onboarding_v2_empty_groups",
        liveGroupId: "188667906749367606",
        decision: "promote_to_live_canonical",
        accepted: true,
        liveMutationAllowed: false,
      },
    ],
  },
  crmDecisionState: {
    patchRows: [
      {
        name: "CC · Source · IG onboarding",
        liveGroupId: "188667906749367606",
        decision: "prepare_local_manifest_patch_after_brand",
        applyNow: false,
        accepted: true,
      },
    ],
  },
};

const brandDictionaryMarkdown = [
  "# Dictionary",
  "",
  "| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |",
  "|---|---|---|---|---|---|",
  "| `CC · Source · IG onboarding` | Source | `proposed_local` | Persona entro. | Routing. | `source=ig_onboarding` |",
  "",
].join("\n");

const crmManifestMarkdown = [
  "# Manifest",
  "",
  "```json",
  JSON.stringify({
    groups: [
      {
        name: "CC · Source · IG onboarding",
        layer: "Source",
        safeToCreateEmpty: true,
      },
    ],
  }, null, 2),
  "```",
  "",
].join("\n");

describe("CRM vNext MailerLite Launch OS taxonomy local patch preview", () => {
  test("normalizes args and default report paths", () => {
    const defaults = parseArgs([]);
    expect(defaults.taxonomyDecisionIntake).toContain("mailerlite_launch_os_taxonomy_refresh_decision_intake_current_2026-06-03.json");
    expect(defaults.out).toContain("mailerlite_launch_os_taxonomy_local_patch_preview_current_2026-06-03.json");

    const parsed = parseArgs([
      "--taxonomy-refresh-handoff",
      "/tmp/handoff.json",
      "--taxonomy-decision-intake",
      "/tmp/intake.json",
      "--brand-dictionary",
      "/tmp/brand.md",
      "--crm-manifest",
      "/tmp/manifest.md",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.taxonomyRefreshHandoff).toBe("/tmp/handoff.json");
    expect(parsed.taxonomyDecisionIntake).toBe("/tmp/intake.json");
    expect(parsed.brandDictionary).toBe("/tmp/brand.md");
    expect(parsed.crmManifest).toBe("/tmp/manifest.md");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
  });

  test("builds a no-live patch preview for accepted Brand and CRM decisions", () => {
    const report = buildTaxonomyLocalPatchPreview({
      taxonomyRefreshHandoff: handoff,
      taxonomyDecisionIntake: readyDecisionIntake,
      brandDictionaryMarkdown,
      crmManifestMarkdown,
      paths: {
        brandDictionary: "/tmp/brand.md",
        crmManifest: "/tmp/manifest.md",
      },
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_local_patch_preview_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      readyForLocalPatchPreview: true,
      brandPatchPreviewRowCount: 1,
      brandStatusChangeCount: 1,
      crmManifestPatchPreviewRowCount: 1,
      crmManifestEntryAddCount: 0,
      crmLiveGroupIdChangeCount: 1,
      crmLiveStatusChangeCount: 1,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
    });
    expect(report.brandPatchPreview[0].proposedLineText).toContain("`live_canonical`");
    expect(report.crmManifestPatchPreview[0].jsonPatchOperations).toEqual([
      {
        op: "add",
        path: "/groups/0/liveGroupId",
        value: "188667906749367606",
      },
      {
        op: "add",
        path: "/groups/0/liveStatus",
        value: "live_canonical_empty_created_2026-05-28",
      },
    ]);
    expect(report.safety).toMatchObject({
      previewOnly: true,
      brandDictionaryMutated: false,
      crmManifestMutated: false,
      mailerLiteApiCalled: false,
      liveApprovalGrantedByPreview: false,
    });
  });

  test("previews adding missing CRM manifest entries from Brand dictionary semantics", () => {
    const report = buildTaxonomyLocalPatchPreview({
      taxonomyRefreshHandoff: handoff,
      taxonomyDecisionIntake: readyDecisionIntake,
      brandDictionaryMarkdown,
      crmManifestMarkdown: [
        "# Manifest",
        "",
        "```json",
        JSON.stringify({ groups: [] }, null, 2),
        "```",
        "",
      ].join("\n"),
      paths: {
        brandDictionary: "/tmp/brand.md",
        crmManifest: "/tmp/manifest.md",
      },
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_local_patch_preview_ready_no_live_changes");
    expect(report.executiveSummary.crmManifestEntryAddCount).toBe(1);
    expect(report.crmManifestPatchPreview[0]).toMatchObject({
      targetFoundInCrmManifest: false,
      manifestEntryAddNeeded: true,
      applyNow: false,
    });
    expect(report.crmManifestPatchPreview[0].jsonPatchOperations[0]).toMatchObject({
      op: "add",
      path: "/groups/-",
    });
    expect(report.crmManifestPatchPreview[0].jsonPatchOperations[0].value).toMatchObject({
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      liveStatus: "live_canonical_empty_created_2026-05-28",
      layer: "Source",
      safeToCreateEmpty: true,
    });
  });

  test("blocks preview when the decision intake is not ready", () => {
    const report = buildTaxonomyLocalPatchPreview({
      taxonomyRefreshHandoff: handoff,
      taxonomyDecisionIntake: {
        ...readyDecisionIntake,
        status: "taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes",
        executiveSummary: {
          readyForLocalPatchPreview: false,
        },
      },
      brandDictionaryMarkdown,
      crmManifestMarkdown,
      paths: {
        brandDictionary: "/tmp/brand.md",
        crmManifest: "/tmp/manifest.md",
      },
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_local_patch_preview_blocked_no_live_changes");
    expect(report.blockers).toContain("decision_intake_not_ready_for_local_patch_preview");
    expect(report.executiveSummary.canApplyBrandDictionaryPatchNow).toBe(false);
    expect(report.executiveSummary.canApplyCrmManifestPatchNow).toBe(false);
  });

  test("builds from files and renders a no-live markdown preview", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taxonomy-local-patch-preview-"));
    const handoffPath = join(dir, "handoff.json");
    const intakePath = join(dir, "intake.json");
    const brandPath = join(dir, "brand.md");
    const manifestPath = join(dir, "manifest.md");

    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
    await writeFile(intakePath, `${JSON.stringify(readyDecisionIntake, null, 2)}\n`, "utf8");
    await writeFile(brandPath, brandDictionaryMarkdown, "utf8");
    await writeFile(manifestPath, crmManifestMarkdown, "utf8");

    const report = await buildTaxonomyLocalPatchPreviewFromFiles({
      taxonomyRefreshHandoff: handoffPath,
      taxonomyDecisionIntake: intakePath,
      brandDictionary: brandPath,
      crmManifest: manifestPath,
    });
    const markdown = renderMarkdown(report);

    expect(report.sourceDigests).toHaveLength(4);
    expect(report.status).toBe("taxonomy_local_patch_preview_ready_no_live_changes");
    expect(markdown).toContain("Taxonomy Local Patch Preview");
    expect(markdown).toContain("Can apply CRM manifest patch now: false");
    expect(markdown).toContain("Live approval granted by preview: false");
  });
});
