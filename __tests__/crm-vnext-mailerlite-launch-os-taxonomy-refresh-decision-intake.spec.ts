import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildTaxonomyRefreshDecisionIntake,
  buildTaxonomyRefreshDecisionIntakeFromFiles,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-decision-intake.mjs";

const handoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  generatedAt: "2026-05-28T00:00:00.000Z",
  executiveSummary: {
    brandPromotionDecisionCount: 2,
    crmManifestPatchCount: 2,
    canAskApprovalNow: false,
    canApplyBrandDictionaryPatchNow: false,
    canApplyCrmManifestPatchNow: false,
    openLiveMutationGateCount: 0,
  },
  brandPromotionRows: [
    {
      name: "CC · Source · IG onboarding",
      sourceId: "onboarding_v2",
      liveGroupId: "188667906749367606",
      currentBrandStatus: "candidate",
      requestedBrandStatus: "live_canonical",
    },
    {
      name: "CC · Journey · Editorial onboarding · In progress",
      sourceId: "onboarding_v2",
      liveGroupId: "188667906749367607",
      currentBrandStatus: "candidate",
      requestedBrandStatus: "live_canonical",
    },
  ],
  crmManifestPatchRows: [
    {
      name: "CC · Source · IG onboarding",
      sourceId: "onboarding_v2",
      liveGroupId: "188667906749367606",
      requestedCrmManifestLiveGroupId: "188667906749367606",
      requestedCrmManifestLiveStatus: "live_canonical_empty_created_2026-05-28",
    },
    {
      name: "CC · Journey · Editorial onboarding · In progress",
      sourceId: "onboarding_v2",
      liveGroupId: "188667906749367607",
      requestedCrmManifestLiveGroupId: "188667906749367607",
      requestedCrmManifestLiveStatus: "live_canonical_empty_created_2026-05-28",
    },
  ],
};

const missingRead = { present: false, value: null, chars: 0, error: null };

const acceptedBrandRead = {
  present: true,
  value: {
    reviewMode: "no_live_taxonomy_refresh_review",
    liveApprovalGranted: false,
    brandDecisions: [
      {
        name: "CC · Source · IG onboarding",
        liveGroupId: "188667906749367606",
        decision: "promote_to_live_canonical",
      },
      {
        name: "CC · Journey · Editorial onboarding · In progress",
        liveGroupId: "188667906749367607",
        decision: "promote_to_live_canonical",
      },
    ],
  },
  chars: 100,
  error: null,
};

const acceptedCrmRead = {
  present: true,
  value: {
    reviewMode: "no_live_taxonomy_refresh_review",
    liveApprovalGranted: false,
    manifestRefreshAccepted: true,
    applyOnlyAfterBrandLiveCanonical: true,
    localPatchOnly: true,
    patchRowCount: 2,
  },
  chars: 100,
  error: null,
};

describe("CRM vNext MailerLite Launch OS taxonomy refresh decision intake", () => {
  test("normalizes args and default report paths", () => {
    const parsed = parseArgs([
      "--taxonomy-refresh-handoff",
      "/tmp/handoff.json",
      "--brand-decision-file",
      "/tmp/brand.json",
      "--crm-decision-file",
      "/tmp/crm.json",
      "--out",
      "/tmp/intake.json",
      "--markdown-out",
      "/tmp/intake.md",
    ]);

    expect(parsed.taxonomyRefreshHandoff).toBe("/tmp/handoff.json");
    expect(parsed.brandDecisionFile).toBe("/tmp/brand.json");
    expect(parsed.crmDecisionFile).toBe("/tmp/crm.json");
    expect(parsed.out).toBe("/tmp/intake.json");
    expect(parsed.markdownOut).toBe("/tmp/intake.md");
  });

  test("waits when Brand and CRM decision files are missing and keeps every live gate closed", () => {
    const report = buildTaxonomyRefreshDecisionIntake({
      taxonomyRefreshHandoff: handoff,
      brandDecisionRead: missingRead,
      crmDecisionRead: missingRead,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      brandDecisionRowsNeeded: 2,
      brandDecisionRowsPresent: 0,
      crmManifestPatchRowsNeeded: 2,
      crmManifestPatchRowsAccepted: 0,
      readyForLocalPatchPreview: false,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(report.blockers).toContain("brand_decision_file_missing");
    expect(report.blockers).toContain("crm_decision_file_missing");
    expect(report.decisionTemplate.brandDecisionTemplate.brandDecisions).toHaveLength(2);
    expect(report.safety).toMatchObject({
      localOnly: true,
      brandDictionaryMutated: false,
      crmManifestMutated: false,
      mailerLiteApiCalled: false,
      liveApprovalGrantedByIntake: false,
    });
  });

  test("marks ready for local patch preview only after all Brand rows are promoted and CRM accepts local-only cache refresh", () => {
    const report = buildTaxonomyRefreshDecisionIntake({
      taxonomyRefreshHandoff: handoff,
      brandDecisionRead: acceptedBrandRead,
      crmDecisionRead: acceptedCrmRead,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_refresh_decision_intake_ready_for_local_patch_preview_no_live_changes");
    expect(report.executiveSummary.readyForLocalPatchPreview).toBe(true);
    expect(report.executiveSummary.brandPromoteCount).toBe(2);
    expect(report.executiveSummary.canApplyBrandDictionaryPatchNow).toBe(false);
    expect(report.executiveSummary.canApplyCrmManifestPatchNow).toBe(false);
    expect(report.blockers).toEqual([]);
  });

  test("blocks unsafe decision files that try to convert review into live approval", () => {
    const report = buildTaxonomyRefreshDecisionIntake({
      taxonomyRefreshHandoff: handoff,
      brandDecisionRead: {
        ...acceptedBrandRead,
        value: {
          ...acceptedBrandRead.value,
          liveApprovalGranted: true,
          mailerLiteMutationAllowed: true,
        },
      },
      crmDecisionRead: acceptedCrmRead,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_refresh_decision_intake_blocked_unsafe_decision_no_live_changes");
    expect(report.unsafeReasons).toContain("brand:liveApprovalGranted_must_be_false");
    expect(report.unsafeReasons).toContain("brand:mailerLiteMutationAllowed_must_not_be_true");
    expect(report.executiveSummary.readyForLocalPatchPreview).toBe(false);
  });

  test("holds local patch preview when Brand decides rename or reject", () => {
    const report = buildTaxonomyRefreshDecisionIntake({
      taxonomyRefreshHandoff: handoff,
      brandDecisionRead: {
        ...acceptedBrandRead,
        value: {
          ...acceptedBrandRead.value,
          brandDecisions: [
            {
              name: "CC · Source · IG onboarding",
              liveGroupId: "188667906749367606",
              decision: "rename",
              finalName: "CC · Source · IG onboarding · Organic",
            },
            {
              name: "CC · Journey · Editorial onboarding · In progress",
              liveGroupId: "188667906749367607",
              decision: "reject",
            },
          ],
        },
      },
      crmDecisionRead: acceptedCrmRead,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes");
    expect(report.executiveSummary.brandRenameCount).toBe(1);
    expect(report.executiveSummary.brandRejectCount).toBe(1);
    expect(report.executiveSummary.readyForLocalPatchPreview).toBe(false);
    expect(report.blockers).toContain("brand_decision_includes_rename_or_reject_requires_new_handoff");
  });

  test("builds from files and renders a no-live markdown receipt", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taxonomy-refresh-decision-intake-"));
    const handoffPath = join(dir, "handoff.json");
    const brandPath = join(dir, "brand.json");
    const crmPath = join(dir, "crm.json");

    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
    await writeFile(brandPath, `${JSON.stringify(acceptedBrandRead.value, null, 2)}\n`, "utf8");
    await writeFile(crmPath, `${JSON.stringify(acceptedCrmRead.value, null, 2)}\n`, "utf8");

    const report = await buildTaxonomyRefreshDecisionIntakeFromFiles({
      taxonomyRefreshHandoff: handoffPath,
      brandDecisionFile: brandPath,
      crmDecisionFile: crmPath,
    });
    const markdown = renderMarkdown(report);

    expect(report.sourceDigests).toHaveLength(3);
    expect(report.executiveSummary.readyForLocalPatchPreview).toBe(true);
    expect(markdown).toContain("Taxonomy Refresh Decision Intake");
    expect(markdown).toContain("Can apply CRM manifest patch now: false");
    expect(markdown).toContain("Live approval granted by intake: false");
  });
});
