import { describe, expect, test } from "vitest";

import {
  buildSeedInboxArtifactQaPacket,
  parseArgs,
  renderMarkdown,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-artifact-qa-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const hash = "a".repeat(64);

const message = (messageKey: string, ctaSlot: string | null, overrides: Record<string, unknown> = {}) => ({
  messageKey,
  messageSha256: hash,
  deliveredToApprovedSeed: true,
  cta: ctaSlot
    ? {
        slot: ctaSlot,
        labelPresent: true,
        urlSha256: hash,
        httpStatus: 200,
        hasNoindex: true,
        expectedPreviewAnchorObserved: true,
      }
    : null,
  rawUrlVisibleInBody: false,
  footerUnsubscribeTextPresent: true,
  footerPostalAddressPresent: true,
  footerSubscriptionReasonLinePresent: true,
  canonicalFooterMatchesReference: true,
  visualSignatureImagePresent: true,
  textSignaturePresent: false,
  replyCtaPresent: ctaSlot == null,
  ...overrides,
});

const baseObservation = () => ({
  launch,
  expectedSeedMessageCount: 4,
  expectedClickthroughCount: 3,
  canonicalReference: {
    messageSha256: hash,
    identitySignatureLinePresent: true,
    bioLinePresent: true,
    newsletterSubscriptionLinePresent: true,
    unsubscribeTextPresent: true,
    visualSignatureImagePresent: true,
  },
  seedMessages: [
    message("E01", "result_or_resource_link"),
    message("E02", "practice_link"),
    message("E03", "editorial_note_link"),
    message("E04", null),
  ],
});

describe("CRM vNext MailerLite mini-launch seed inbox artifact QA packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/assets.json",
      "--seed-inbox-observation",
      "/tmp/observation.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/assets.json");
    expect(parsed.seedInboxObservation).toBe("/tmp/observation.json");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
  });

  test("passes only when seed click-through, footer and signature artifacts are green", () => {
    const report = buildSeedInboxArtifactQaPacket({
      assetManifest: { launch },
      seedInboxObservation: baseObservation(),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("seed_inbox_artifact_qa_ready_for_ceo_review_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      seedInboxArtifactQaPassed: true,
      realSeedClickthroughVerified: true,
      visibleRawUrlTextCount: 0,
      canonicalMailerLiteFooterVerified: true,
      visualSignatureAssetVerified: true,
      signatureFallbackPresent: false,
      blockerCount: 0,
      liveActionAllowedNow: false,
    });
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("turns seed inbox defects into precise blockers without leaking URLs or recipients", () => {
    const observation = baseObservation();
    observation.seedMessages[0] = message("E01", "result_or_resource_link", {
      rawUrlVisibleInBody: true,
      canonicalFooterMatchesReference: false,
      visualSignatureImagePresent: false,
      textSignaturePresent: true,
    });

    const report = buildSeedInboxArtifactQaPacket({
      assetManifest: { launch },
      seedInboxObservation: observation,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("seed_inbox_artifact_qa_blocked_before_ceo_review_no_live_changes");
    expect(report.executiveSummary.blockers).toEqual(expect.arrayContaining([
      "visible_raw_url_text_present_in_seed_inbox_body",
      "canonical_mailerlite_footer_not_verified",
      "visual_signature_asset_not_verified",
      "signature_fallback_still_present_in_payload",
    ]));

    const markdown = renderMarkdown(report);
    expect(markdown).toContain("Visible raw URL text hits in seed inbox body: 1");
    expect(markdown).not.toContain("https://");
    expect(markdown).not.toContain("@");
  });
});
