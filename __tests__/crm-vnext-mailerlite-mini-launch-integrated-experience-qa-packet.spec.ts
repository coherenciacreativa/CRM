import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildIntegratedExperienceQaPacket,
  parseArgs,
  renderMarkdown,
  scanSourceText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-integrated-experience-qa-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const writeFixtureFiles = async ({
  shopifyText = "<section>Recurso completo sin placeholders.</section>",
  htmlText = "<html><body><a href=\"https://preview.example/redacted\">Ver recurso</a></body></html>",
} = {}) => {
  const dir = await mkdtemp(join(tmpdir(), "integrated-experience-qa-"));
  const shopifyPath = join(dir, "result-inteligencia.liquid");
  const htmlPath = join(dir, "email.html");
  await writeFile(shopifyPath, shopifyText);
  await writeFile(htmlPath, htmlText);
  return { dir, shopifyPath, htmlPath };
};

const baseReports = async (overrides: Record<string, unknown> = {}) => {
  const { shopifyPath, htmlPath } = await writeFixtureFiles(overrides as { shopifyText?: string; htmlText?: string });

  return {
    assetManifest: {
      launch,
      executiveSummary: {
        finalPublicLinksReady: true,
      },
      sourceDigests: [
        {
          path: shopifyPath,
          consultedFor: "local Shopify asset slot and placeholder evidence",
        },
      ],
    },
    correctionPreview: {
      status: "seed_inbox_correction_preview_ready_no_live_changes",
      executiveSummary: {
        finalPublicLinksReady: true,
        redactedPayloadManifestReady: true,
      },
    },
    payloadManifest: {
      launch,
      executiveSummary: {
        payloadCount: 4,
        contentBlockCount: 40,
      },
      payloads: [
        {
          contentBlocks: [
            { value: "Ver recurso" },
            { value: "Un abrazo, Alejandro" },
            { value: "Alejandro signature asset or text-signature fallback" },
            { value: "Use MailerLite platform unsubscribe/footer only; do not add a custom subscription-reason line." },
          ],
        },
      ],
    },
    emailRenderQa: {
      executiveSummary: {
        localRenderReady: true,
        redCheckCount: 0,
      },
      emailQa: [
        { htmlPath },
      ],
    },
    realMailerLiteRenderQa: {
      executiveSummary: {
        allDraftsPreviewed: true,
        allRequiredContentExact: true,
        allSafetyGatesClosed: true,
      },
    },
    nullAudienceSeedInboxQa: {
      deliverySummary: {
        seedInboxQaGreen: true,
      },
    },
    publicLaunchReadinessPacket: {
      executiveSummary: {
        readyForExactPublicSendApproval: false,
        liveActionAllowedNow: false,
      },
    },
    pilotDistributionDecisionIntake: {
      executiveSummary: {
        wouldAuthorizeSend: false,
      },
    },
  };
};

describe("CRM vNext MailerLite mini-launch integrated experience QA packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/assets.json",
      "--correction-preview",
      "/tmp/correction.json",
      "--payload-manifest",
      "/tmp/payload.json",
      "--email-render-qa",
      "/tmp/render.json",
      "--real-mailerlite-render-qa",
      "/tmp/real.json",
      "--null-audience-seed-inbox-qa",
      "/tmp/seed.json",
      "--seed-inbox-artifact-qa-packet",
      "/tmp/seed-artifact.json",
      "--public-launch-readiness-packet",
      "/tmp/public.json",
      "--product-value-review-packet",
      "/tmp/product-value.json",
      "--pilot-distribution-decision-intake",
      "/tmp/pilot.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/assets.json");
    expect(parsed.payloadManifest).toBe("/tmp/payload.json");
    expect(parsed.seedInboxArtifactQaPacket).toBe("/tmp/seed-artifact.json");
    expect(parsed.productValueReviewPacket).toBe("/tmp/product-value.json");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
  });

  test("detects visible Shopify placeholders", () => {
    const hits = scanSourceText({
      path: "/tmp/source.liquid",
      text: [
        "<div data-result-placeholder=\"result_or_resource_link_placeholder\">",
        "Lectura o recurso principal: pendiente de conexion.",
      ].join("\n"),
    });

    expect(hits.map((hit) => hit.checkId)).toContain("placeholder_data_attribute");
    expect(hits.map((hit) => hit.checkId)).toContain("literal_placeholder");
    expect(hits.map((hit) => hit.checkId)).toContain("pending_connection");
  });

  test("blocks CEO review when signature, footer, click-through, value and Shopify completeness are not proven", async () => {
    const reports = await baseReports({
      shopifyText: [
        "<section data-result-placeholder=\"result_or_resource_link_placeholder\">",
        "Recursos preparados como placeholders",
        "La conexion real queda cerrada hasta que el flujo real sea aprobado.",
      ].join("\n"),
      htmlText: [
        "<html><body>",
        "<a href=\"https://preview.example/redacted\">Ver recurso</a>",
        "<p>https://preview.example/redacted</p>",
        "</body></html>",
      ].join("\n"),
    });

    const report = await buildIntegratedExperienceQaPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("integrated_experience_qa_blocked_before_ceo_review_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      ceoReviewReady: false,
      integratedExperienceReady: false,
      distributionDecisionShouldWait: true,
      canAskPilotDistributionDecisionNow: false,
      canAskPublicSendApprovalNow: false,
      liveActionAllowedNow: false,
    });
    expect(report.executiveSummary.blockers).toEqual(expect.arrayContaining([
      "visual_signature_asset_not_verified",
      "signature_fallback_still_present_in_payload",
      "canonical_mailerlite_footer_not_verified",
      "platform_footer_policy_is_not_canonical_footer_proof",
      "real_seed_clickthrough_not_verified",
      "visible_raw_url_text_present_in_local_html",
      "shopify_asset_placeholders_visible",
      "product_value_review_gate_missing",
    ]));
    expect(report.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
    });
  });

  test("can mark the integrated experience ready when all evidence is explicit", async () => {
    const reports = await baseReports();
    reports.payloadManifest.executiveSummary = {
      ...reports.payloadManifest.executiveSummary,
      visualSignatureAssetVerified: true,
      canonicalMailerLiteFooterVerified: true,
      productValueReviewPassed: true,
    };
    reports.payloadManifest.payloads = [
      {
        contentBlocks: [
          { value: "Ver recurso" },
          { value: "Un abrazo, Alejandro" },
          { value: "signature asset verified" },
          { value: "canonical footer verified" },
        ],
      },
    ];
    reports.nullAudienceSeedInboxQa.deliverySummary = {
      ...reports.nullAudienceSeedInboxQa.deliverySummary,
      ctaClickthroughGreen: true,
    };

    const report = await buildIntegratedExperienceQaPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("integrated_experience_qa_ready_for_ceo_review_no_live_changes");
    expect(report.executiveSummary.ceoReviewReady).toBe(true);
    expect(report.executiveSummary.distributionDecisionShouldWait).toBe(false);
    expect(report.executiveSummary.canAskPilotDistributionDecisionNow).toBe(true);
    expect(report.executiveSummary.canAskPublicSendApprovalNow).toBe(false);
  });

  test("uses Product/Value review packet blockers when the gate exists but is not green", async () => {
    const reports = await baseReports();
    const report = await buildIntegratedExperienceQaPacket({
      ...reports,
      productValueReviewPacket: {
        status: "product_value_review_blocked_before_ceo_review_no_live_changes",
        executiveSummary: {
          productValueReviewPassed: false,
          blockerCount: 2,
          blockers: ["shopify_asset_placeholders_visible", "real_seed_clickthrough_not_verified"],
        },
      },
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.executiveSummary.productValueReviewStatus).toBe("product_value_review_blocked_before_ceo_review_no_live_changes");
    expect(report.executiveSummary.productValueReviewPassed).toBe(false);
    expect(report.executiveSummary.blockers).toEqual(expect.arrayContaining([
      "product_value_review_not_green",
      "product_value_shopify_asset_placeholders_visible",
      "product_value_real_seed_clickthrough_not_verified",
    ]));
    expect(report.executiveSummary.blockers).not.toContain("product_value_review_gate_missing");
  });

  test("uses seed inbox artifact QA to verify click-through but block raw visible URLs", async () => {
    const reports = await baseReports();
    reports.nullAudienceSeedInboxQa.deliverySummary = {};
    const report = await buildIntegratedExperienceQaPacket({
      ...reports,
      seedInboxArtifactQaPacket: {
        status: "seed_inbox_artifact_qa_blocked_before_ceo_review_no_live_changes",
        executiveSummary: {
          realSeedClickthroughVerified: true,
          visibleRawUrlTextCount: 3,
          canonicalMailerLiteFooterVerified: false,
          visualSignatureAssetVerified: false,
          signatureFallbackPresent: true,
          footerCompliancePresent: true,
        },
      },
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    const ctaGate = report.gateMatrix.find((entry) => entry.id === "cta_clickthrough_experience");
    expect(ctaGate?.evidence).toMatchObject({
      clickthroughVerified: true,
      seedClickthroughVerified: true,
      seedRawUrlVisibleCount: 3,
    });
    expect(report.executiveSummary.blockers).toEqual(expect.arrayContaining([
      "visible_raw_url_text_present_in_seed_inbox_body",
      "visual_signature_asset_not_verified",
      "canonical_mailerlite_footer_not_verified",
      "signature_fallback_still_present_in_payload",
    ]));
    expect(report.executiveSummary.blockers).not.toContain("real_seed_clickthrough_not_verified");
  });

  test("renders markdown without leaking exact URLs", async () => {
    const reports = await baseReports({
      shopifyText: "<p>pendiente de conexion https://secret.example/link</p>",
    });
    const report = await buildIntegratedExperienceQaPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Distribution decision should wait: true");
    expect(markdown).toContain("[redacted_url]");
    expect(markdown).not.toContain("https://secret.example/link");
  });
});
