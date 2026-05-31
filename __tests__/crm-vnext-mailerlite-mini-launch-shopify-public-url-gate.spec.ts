import { describe, expect, test } from "vitest";

import {
  buildSafety,
  buildShopifyPublicUrlGate,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-shopify-public-url-gate.mjs";

const shopifyLocalBuildReceipt = {
  ok: true,
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
};

const localSlot = (key: string, pathCandidate: string) => ({
  key,
  label: key,
  status: "local_asset_slot_ready_waiting_for_public_url_no_live_changes",
  localEvidenceReady: true,
  publicUrlReady: false,
  pathCandidate,
  publicUrlSha256: null,
  exactPublicUrlStoredInReport: false,
  owner: "web_design_or_shopify_publish_receipt",
  nextOwner: "web_design_or_shopify_publish_receipt",
  blockers: ["public_shopify_url_missing"],
});

const assetManifest = {
  ok: true,
  mode: "local_only_mailerlite_mini_launch_asset_manifest",
  status: "mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes",
  launch: shopifyLocalBuildReceipt.launch,
  executiveSummary: {
    finalPublicLinksReady: false,
    requiresAlejandroManualLinks: false,
  },
  finalPublicLinks: {
    status: "system_pending_public_urls_no_live_changes",
    slots: [
      localSlot("result_or_resource_link", "/pages/result-inteligencia-para-descansar"),
      localSlot("practice_link", "/pages/result-inteligencia-para-descansar#practice"),
      localSlot("editorial_note_link", "/pages/result-inteligencia-para-descansar#editorial-note"),
    ],
  },
};

describe("CRM vNext MailerLite mini-launch Shopify public URL gate", () => {
  test("normalizes args and local report outputs", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/asset-manifest.json",
      "--shopify-local-build-receipt",
      "/tmp/shopify-receipt.json",
      "--out",
      "/tmp/public-url-gate.json",
      "--markdown-out",
      "/tmp/public-url-gate.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/asset-manifest.json");
    expect(parsed.shopifyLocalBuildReceipt).toBe("/tmp/shopify-receipt.json");
    expect(parsed.out).toBe("/tmp/public-url-gate.json");
    expect(parsed.markdownOut).toBe("/tmp/public-url-gate.md");
  });

  test("keeps the public URL boundary local and withholds approval phrase", () => {
    const report = buildShopifyPublicUrlGate({
      assetManifest,
      shopifyLocalBuildReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("shopify_public_url_gate_waiting_decision_no_live_changes");
    expect(report.executiveSummary.localAssetSlotReadyCount).toBe(3);
    expect(report.executiveSummary.publicUrlReadyCount).toBe(0);
    expect(report.executiveSummary.requiresAlejandroManualLinks).toBe(false);
    expect(report.executiveSummary.approvalPhraseAvailable).toBe(false);
    expect(report.executiveSummary.exactApprovalPhrasePrinted).toBe(false);
    expect(report.executiveSummary.canPublishNow).toBe(false);
    expect(report.decisionBoundary).toMatchObject({
      explanationRequiredBeforeApprovalPhrase: true,
      approvalPhraseAvailable: false,
      canAskApprovalNow: false,
      canPublishNow: false,
      packetIsApprovalByItself: false,
    });
    expect(report.publicUrlPlan.slots.filter((slot) => slot.anchorCandidate)).toHaveLength(2);
    expect(report.blockers).toContain("shopify_public_url_decision_not_explained");
    expect(markdown).toContain("Approval phrase available: false");
    expect(markdown).toContain("shopify_publish");
    expect(report.safety).toMatchObject({
      localOnly: true,
      shopifyApiCalled: false,
      shopifyPublishPerformed: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
    });
  });

  test("reports missing local evidence without opening any live gate", () => {
    const report = buildShopifyPublicUrlGate({
      assetManifest: { ...assetManifest, finalPublicLinks: { slots: [] } },
      shopifyLocalBuildReceipt: { ...shopifyLocalBuildReceipt, status: "not_ready" },
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(report.ok).toBe(true);
    expect(report.status).toBe("shopify_public_url_gate_blocked_missing_local_evidence_no_live_changes");
    expect(report.blockers).toContain("shopify_local_build_receipt_not_ready");
    expect(report.blockers).toContain("local_asset_slots_not_ready");
    expect(buildSafety().crmLiveApiCalled).toBe(false);
  });
});
