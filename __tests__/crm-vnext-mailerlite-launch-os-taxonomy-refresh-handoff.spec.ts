import { describe, expect, test } from "vitest";

import {
  buildTaxonomyRefreshHandoff,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-handoff.mjs";

const taxonomyConsolidationAudit = {
  status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
  executiveSummary: {
    liveEvidenceGroupCount: 2,
  },
  consolidatedRows: [
    {
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      sourceId: "onboarding_v2_empty_groups",
      brandStatus: "proposed_local",
      brandLayer: "Source",
    },
    {
      name: "CC · Source · Resource · Brújula",
      liveGroupId: "188581887447401645",
      sourceId: "first_live_canonical_batch",
      brandStatus: "live_canonical",
      brandLayer: "Source",
    },
  ],
  brandPromotionNeeded: [
    {
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      currentBrandStatus: "proposed_local",
      expectedBrandStatus: "live_canonical",
      sourceId: "onboarding_v2_empty_groups",
    },
  ],
  crmManifestRefreshNeeded: [
    {
      name: "CC · Source · IG onboarding",
      liveGroupId: "188667906749367606",
      currentCrmManifestLiveGroupId: null,
      currentCrmManifestLiveStatus: null,
      expectedCrmManifestLiveStatus: "live_canonical_empty_created",
      sourceId: "onboarding_v2_empty_groups",
    },
  ],
};

describe("CRM vNext MailerLite Launch OS taxonomy refresh handoff", () => {
  test("turns taxonomy drift into Brand and CRM handoff rows without opening gates", () => {
    const handoff = buildTaxonomyRefreshHandoff({
      taxonomyConsolidationAudit,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(handoff.status).toBe("taxonomy_refresh_handoff_ready_no_live_changes");
    expect(handoff.executiveSummary).toMatchObject({
      sourceAuditStatus: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
      liveEvidenceGroupCount: 2,
      brandPromotionDecisionCount: 1,
      crmManifestPatchCount: 1,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(handoff.brandPromotionRows[0]).toMatchObject({
      name: "CC · Source · IG onboarding",
      currentBrandStatus: "proposed_local",
      requestedBrandStatus: "live_canonical",
      allowsLiveMailerLiteChanges: false,
    });
    expect(handoff.crmManifestPatchRows[0]).toMatchObject({
      requestedCrmManifestLiveGroupId: "188667906749367606",
      requestedCrmManifestLiveStatus: "live_canonical_empty_created_2026-05-28",
      safeToApplyBeforeBrandLiveCanonical: false,
    });
    expect(handoff.safety).toMatchObject({
      brandDictionaryMutated: false,
      crmManifestMutated: false,
      mailerLiteApiCalled: false,
      groupMutationsPerformed: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders a Markdown handoff with exact Brand and CRM prompts", () => {
    const handoff = buildTaxonomyRefreshHandoff({
      taxonomyConsolidationAudit,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(handoff);

    expect(markdown).toContain("Taxonomy Refresh Handoff");
    expect(markdown).toContain("Brand promotion decisions: 1");
    expect(markdown).toContain("CRM manifest patch rows: 1");
    expect(markdown).toContain("Brand:");
    expect(markdown).toContain("CRM:");
    expect(markdown).toContain("Brand dictionary mutated: false");
  });

  test("reports not-needed status when the consolidation audit has no drift", () => {
    const handoff = buildTaxonomyRefreshHandoff({
      taxonomyConsolidationAudit: {
        status: "taxonomy_receipts_consolidated_no_live_changes",
        executiveSummary: { liveEvidenceGroupCount: 1 },
        brandPromotionNeeded: [],
        crmManifestRefreshNeeded: [],
        consolidatedRows: [],
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(handoff.status).toBe("taxonomy_refresh_handoff_not_needed_no_live_changes");
    expect(handoff.executiveSummary).toMatchObject({
      brandPromotionDecisionCount: 0,
      crmManifestPatchCount: 0,
      allBrandRowsAlreadyLiveCanonical: true,
      allCrmManifestRowsAlreadyRefreshed: true,
    });
  });
});
