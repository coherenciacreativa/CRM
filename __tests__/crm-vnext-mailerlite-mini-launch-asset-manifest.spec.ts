import { describe, expect, test } from "vitest";

import {
  buildAssetManifest,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-asset-manifest.mjs";

const shopifyLocalBuildReceipt = {
  ok: true,
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
};

const resultSection = [
  "<section>",
  '<p data-result-placeholder="result_or_resource_link_placeholder">Lectura</p>',
  '<p data-practice-placeholder="practice_link_placeholder">Practica</p>',
  '<p data-editorial-placeholder="editorial_note_link_placeholder">Nota</p>',
  "</section>",
].join("\n");

const polishedResultSection = [
  "<section>",
  "<p>Lectura principal lista para QA.</p>",
  '<div id="practice">Practica breve lista para QA.</div>',
  '<div id="editorial-note">Nota editorial lista para QA.</div>',
  "</section>",
].join("\n");

const fileEvidence = [
  {
    relativePath: "sections/result-inteligencia-para-descansar.liquid",
    path: "/tmp/shopify/sections/result-inteligencia-para-descansar.liquid",
    present: true,
    chars: resultSection.length,
    sha256: "result-sha",
    content: resultSection,
  },
  {
    relativePath: "templates/page.result-inteligencia-para-descansar.json",
    path: "/tmp/shopify/templates/page.result-inteligencia-para-descansar.json",
    present: true,
    chars: 120,
    sha256: "template-sha",
    content: '{"sections":{"main":{"type":"result-inteligencia-para-descansar"}}}',
  },
];

const previewRouteExecutionReceipt = {
  ok: true,
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    previewRouteReady: true,
    publicAudienceSendUrlGateReady: false,
  },
  targetLinks: [
    {
      key: "result_or_resource_link",
      stageAfter: "preview_url_ready",
      audienceSendReady: false,
      urlSha256: "a".repeat(64),
    },
    {
      key: "practice_link",
      stageAfter: "preview_url_ready",
      audienceSendReady: false,
      urlSha256: "b".repeat(64),
    },
    {
      key: "editorial_note_link",
      stageAfter: "preview_url_ready",
      audienceSendReady: false,
      urlSha256: "c".repeat(64),
    },
  ],
  safety: {
    scopedLiveShopifyMutationApproved: true,
    shopifyApiCalled: true,
    shopifyMutationsPerformed: true,
    siteNavigationUpdated: false,
    seoIndexingAllowed: false,
    realFormsCreated: false,
    mailerLiteApiCalled: false,
    mailerLiteMutationsPerformed: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch asset manifest", () => {
  test("normalizes args and local report outputs", () => {
    const parsed = parseArgs([
      "--shopify-repo",
      "/tmp/shopify",
      "--shopify-local-build-receipt",
      "/tmp/receipt.json",
      "--out",
      "/tmp/asset-manifest.json",
      "--markdown-out",
      "/tmp/asset-manifest.md",
    ]);

    expect(parsed.shopifyRepo).toBe("/tmp/shopify");
    expect(parsed.shopifyLocalBuildReceipt).toBe("/tmp/receipt.json");
    expect(parsed.out).toBe("/tmp/asset-manifest.json");
    expect(parsed.markdownOut).toBe("/tmp/asset-manifest.md");
  });

  test("maps local Shopify placeholders to system-owned link slots", () => {
    const report = buildAssetManifest({
      shopifyLocalBuildReceipt,
      fileEvidence,
      shopifyRepo: "/tmp/shopify",
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes");
    expect(report.executiveSummary.localAssetSlotReadyCount).toBe(3);
    expect(report.executiveSummary.finalPublicLinksReady).toBe(false);
    expect(report.executiveSummary.linkLifecyclePolicy).toBe("single_slot_preview_to_live_lifecycle");
    expect(report.executiveSummary.previewUrlReadyCount).toBe(0);
    expect(report.executiveSummary.liveUrlReadyCount).toBe(0);
    expect(report.executiveSummary.publicAudienceSendUrlGateReady).toBe(false);
    expect(report.executiveSummary.requiresAlejandroManualLinks).toBe(false);
    expect(report.subscriptionReasonPolicy).toMatchObject({
      status: "ready_no_live_changes",
      policy: "remove_custom_line_and_rely_on_platform_footer",
      humanInputRequired: false,
    });
    expect(report.finalPublicLinks.status).toBe("system_pending_public_urls_no_live_changes");
    expect(report.finalPublicLinks.slots.map((slot) => slot.key)).toEqual([
      "result_or_resource_link",
      "practice_link",
      "editorial_note_link",
    ]);
    expect(report.finalPublicLinks.slots.every((slot) => slot.humanInputRequired === false)).toBe(true);
    expect(report.finalPublicLinks.lifecyclePolicy).toMatchObject({
      singleSlotLifecycle: true,
      noSeparateUrlSetsRequired: true,
      audienceSendAllowedStages: ["live_url_ready", "preview_promoted_to_live"],
    });
    expect(report.finalPublicLinks.slots.every((slot) => slot.linkLifecycle.currentStage === "local_candidate")).toBe(true);
    expect(report.finalPublicLinks.blockers).toContain("public_shopify_url_missing");
    expect(markdown).toContain("Link lifecycle policy: single_slot_preview_to_live_lifecycle");
    expect(markdown).toContain("Audience-send URL gate ready: false");
    expect(markdown).toContain("Requires Alejandro manual links: false");
    expect(report.safety).toMatchObject({
      localOnly: true,
      shopifyApiCalled: false,
      shopifyPublishPerformed: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
    });
  });

  test("keeps local asset slots ready after preview placeholders are replaced", () => {
    const report = buildAssetManifest({
      shopifyLocalBuildReceipt,
      shopifyPreviewRouteExecutionReceipt: previewRouteExecutionReceipt,
      fileEvidence: fileEvidence.map((file) =>
        file.relativePath === "sections/result-inteligencia-para-descansar.liquid"
          ? {
              ...file,
              chars: polishedResultSection.length,
              content: polishedResultSection,
            }
          : file),
      shopifyRepo: "/tmp/shopify",
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("mini_launch_asset_manifest_ready_for_correction_inputs_no_live_changes");
    expect(report.executiveSummary.localAssetSlotReadyCount).toBe(3);
    expect(report.executiveSummary.publicUrlReadyCount).toBe(3);
    expect(report.executiveSummary.finalPublicLinksReady).toBe(true);
    expect(report.finalPublicLinks.slots.every((slot) => slot.placeholderPresent === false)).toBe(true);
    expect(report.finalPublicLinks.slots.every((slot) => slot.linkLifecycle.currentStage === "preview_url_ready")).toBe(true);
    expect(report.finalPublicLinks.blockers.some((blocker) => blocker.startsWith("placeholder_missing:"))).toBe(false);
  });

  test("keeps hard live gates closed even when local evidence is missing", () => {
    const report = buildAssetManifest({
      shopifyLocalBuildReceipt: { ...shopifyLocalBuildReceipt, status: "not_ready" },
      fileEvidence: [],
      shopifyRepo: "/tmp/shopify",
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(report.status).toBe("mini_launch_asset_manifest_blocked_missing_local_asset_evidence_no_live_changes");
    expect(report.executiveSummary.localAssetSlotReadyCount).toBe(0);
    expect(report.finalPublicLinks.blockers).toContain("shopify_local_build_receipt_not_ready");
    expect(buildSafety().crmLiveApiCalled).toBe(false);
  });
});
