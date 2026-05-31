import { describe, expect, test } from "vitest";

import {
  buildPreviewRouteDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.mjs";

const assetManifest = {
  ok: true,
  status: "mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  finalPublicLinks: {
    lifecyclePolicy: {
      id: "single_slot_preview_to_live_lifecycle",
      noSeparateUrlSetsRequired: true,
    },
    slots: [
      {
        key: "result_or_resource_link",
        label: "Result/resource page",
        pathCandidate: "/pages/result-inteligencia-para-descansar",
        localEvidenceReady: true,
        publicUrlReady: false,
        linkLifecycle: { currentStage: "local_candidate" },
      },
      {
        key: "practice_link",
        label: "Practice section",
        pathCandidate: "/pages/result-inteligencia-para-descansar#practice",
        localEvidenceReady: true,
        publicUrlReady: false,
        linkLifecycle: { currentStage: "local_candidate" },
      },
      {
        key: "editorial_note_link",
        label: "Editorial note section",
        pathCandidate: "/pages/result-inteligencia-para-descansar#editorial-note",
        localEvidenceReady: true,
        publicUrlReady: false,
        linkLifecycle: { currentStage: "local_candidate" },
      },
    ],
  },
};

const shopifyPublicUrlGate = {
  ok: true,
  status: "shopify_public_url_gate_waiting_decision_no_live_changes",
  launch: assetManifest.launch,
  executiveSummary: {
    finalPublicLinksReady: false,
    recommendedVisibilityTier: "unlisted_noindex_preview",
  },
  publicUrlPlan: {
    slots: assetManifest.finalPublicLinks.slots,
  },
  linkLifecycleGuard: {
    policy: assetManifest.finalPublicLinks.lifecyclePolicy,
  },
};

const shopifyLocalBuildReceipt = {
  ok: true,
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  files: [
    {
      path: "sections/result-inteligencia-para-descansar.liquid",
      status: "created_local_only",
      purpose: "Result and resource preview surface.",
      sha256: "a".repeat(64),
    },
  ],
};

describe("CRM vNext MailerLite mini-launch Shopify preview route decision packet", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--shopify-public-url-gate",
      "/tmp/public-url-gate.json",
      "--asset-manifest",
      "/tmp/asset-manifest.json",
      "--shopify-local-build-receipt",
      "/tmp/local-build.json",
      "--out",
      "/tmp/decision.json",
      "--markdown-out",
      "/tmp/decision.md",
    ]);

    expect(parsed.shopifyPublicUrlGate).toBe("/tmp/public-url-gate.json");
    expect(parsed.assetManifest).toBe("/tmp/asset-manifest.json");
    expect(parsed.shopifyLocalBuildReceipt).toBe("/tmp/local-build.json");
    expect(parsed.out).toBe("/tmp/decision.json");
    expect(parsed.markdownOut).toBe("/tmp/decision.md");
  });

  test("explains preview route decision without printing an approval phrase", () => {
    const packet = buildPreviewRouteDecisionPacket({
      shopifyPublicUrlGate,
      assetManifest,
      shopifyLocalBuildReceipt,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("shopify_preview_route_decision_ready_for_human_explanation_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      recommendedDecision: "use_unlisted_noindex_preview_route_for_test_launch_links",
      recommendedVisibilityTier: "unlisted_noindex_preview",
      decisionExplanationReady: true,
      exactApprovalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      canAskApprovalNow: false,
      canPublishNow: false,
      publicAudienceSendUrlGateReady: false,
    });
    expect(packet.slotScope.every((slot) => slot.nextStageAfterApprovedPreviewRoute === "preview_url_ready")).toBe(true);
    expect(packet.slotScope.every((slot) => slot.audienceSendReadyAfterApprovedPreviewRoute === false)).toBe(true);
    expect(packet.approvalPhrasePolicy.canGenerateExactPhraseAfterHumanConfirmsDecision).toBe(true);
    expect(JSON.stringify(packet)).not.toContain("Apruebo");
  });

  test("keeps forbidden actions and receipt requirements explicit", () => {
    const packet = buildPreviewRouteDecisionPacket({
      shopifyPublicUrlGate,
      assetManifest,
      shopifyLocalBuildReceipt,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.proposedScopeIfLaterApproved.allowedActions).toContain(
      "create_or_update_shopify_preview_route_for_existing_local_inteligencia_para_descansar_assets",
    );
    expect(packet.proposedScopeIfLaterApproved.forbiddenActions).toContain(
      "do_not_connect_mailerlite_groups_tags_workflows_or_subscribers",
    );
    expect(packet.proposedScopeIfLaterApproved.requiredReceiptFields).toContain(
      "visibility_tier=unlisted_noindex_preview",
    );
  });

  test("blocks if the public URL gate is not ready", () => {
    const packet = buildPreviewRouteDecisionPacket({
      shopifyPublicUrlGate: {
        ...shopifyPublicUrlGate,
        status: "shopify_public_url_gate_blocked_no_live_changes",
      },
      assetManifest,
      shopifyLocalBuildReceipt,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.ok).toBe(false);
    expect(packet.status).toBe("shopify_preview_route_decision_blocked_no_live_changes");
    expect(packet.blockers).toContain("shopify_public_url_gate_not_ready");
    expect(packet.approvalPhrasePolicy.canGenerateExactPhraseAfterHumanConfirmsDecision).toBe(false);
  });

  test("renders markdown and keeps safety closed", () => {
    const packet = buildPreviewRouteDecisionPacket({
      shopifyPublicUrlGate,
      assetManifest,
      shopifyLocalBuildReceipt,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Shopify Preview Route Decision Packet");
    expect(markdown).toContain("Exact approval phrase printed: false");
    expect(markdown).toContain("No MailerLite API/UI mutation");
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      shopifyApiCalled: false,
      shopifyRepoFilesWritten: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      exactApprovalPhrasePrinted: false,
    });
  });
});
