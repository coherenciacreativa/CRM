import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildProductValueReviewPacket,
  parseArgs,
  renderMarkdown,
  scanSourceText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-product-value-review-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const writeShopifyFixture = async (shopifyText = "<section>Recurso completo para descansar con una practica breve.</section>") => {
  const dir = await mkdtemp(join(tmpdir(), "product-value-review-"));
  const shopifyPath = join(dir, "result-inteligencia.liquid");
  await writeFile(shopifyPath, shopifyText);
  return { dir, shopifyPath };
};

const baseReports = async (overrides: { shopifyText?: string } = {}) => {
  const { shopifyPath } = await writeShopifyFixture(overrides.shopifyText);

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
      launch: {
        ...launch,
        sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
        deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
      },
      executiveSummary: {
        payloadCount: 4,
        contentBlockCount: 44,
      },
      payloads: [
        {
          subject: "Una inteligencia para descansar",
          preheader: "Una pausa breve para escuchar tu cuerpo",
          plainTextFallback: "Ver recurso y hacer una practica pequena.",
          contentBlocks: [
            { value: "Cuando el cansancio se mezcla con ruido y exigencia, descansar tambien pide inteligencia." },
            { value: "Haz una pausa breve, observa el cuerpo y responde una pregunta simple." },
            { value: "Un abrazo, Alejandro" },
          ],
          cta: { label: "Ver recurso" },
        },
      ],
    },
    integratedExperienceQaPacket: {
      executiveSummary: {
        blockers: ["real_seed_clickthrough_not_verified"],
      },
      gateMatrix: [
        {
          id: "cta_clickthrough_experience",
          evidence: {
            clickthroughVerified: false,
          },
        },
      ],
      emailHtmlVisibleUrlScan: {
        visibleUrlTextCount: 0,
      },
    },
  };
};

describe("CRM vNext MailerLite mini-launch product/value review packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/assets.json",
      "--correction-preview",
      "/tmp/correction.json",
      "--payload-manifest",
      "/tmp/payload.json",
      "--integrated-experience-qa-packet",
      "/tmp/integrated.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/assets.json");
    expect(parsed.integratedExperienceQaPacket).toBe("/tmp/integrated.json");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
  });

  test("detects visible product placeholders in Shopify source", () => {
    const hits = scanSourceText({
      path: "/tmp/source.liquid",
      text: [
        "<p data-result-placeholder=\"result_or_resource_link_placeholder\">",
        "Lectura o recurso principal: pendiente de conexion.",
      ].join("\n"),
    });

    expect(hits.map((hit) => hit.checkId)).toContain("placeholder_data_attribute");
    expect(hits.map((hit) => hit.checkId)).toContain("literal_placeholder");
    expect(hits.map((hit) => hit.checkId)).toContain("pending_connection");
  });

  test("blocks CEO value review when assets and click-through are incomplete", async () => {
    const reports = await baseReports({
      shopifyText: [
        "<section data-result-placeholder=\"result_or_resource_link_placeholder\">",
        "Recursos preparados como placeholders",
        "La conexion real queda cerrada hasta que el flujo real sea aprobado.",
        "</section>",
      ].join("\n"),
    });

    const report = await buildProductValueReviewPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("product_value_review_blocked_before_ceo_review_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      productValueReviewPassed: false,
      ceoReviewValueReady: false,
      liveActionAllowedNow: false,
    });
    expect(report.executiveSummary.blockers).toEqual(expect.arrayContaining([
      "shopify_asset_placeholders_visible",
      "real_seed_clickthrough_not_verified",
    ]));
    expect(report.gateMatrix.find((entry) => entry.id === "audience_pain_fit")?.ready).toBe(true);
    expect(report.gateMatrix.find((entry) => entry.id === "ethical_scope_and_claims")?.ready).toBe(true);
    expect(report.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
    });
  });

  test("passes when the value, asset and delivery gates are green", async () => {
    const reports = await baseReports();
    reports.payloadManifest.payloads[0].contentBlocks.push({
      value: "Esto no es un diagnostico: es una guia pequena para observar el descanso.",
    });
    reports.integratedExperienceQaPacket = {
      executiveSummary: {
        blockers: [],
      },
      gateMatrix: [
        {
          id: "cta_clickthrough_experience",
          evidence: {
            clickthroughVerified: true,
          },
        },
      ],
      emailHtmlVisibleUrlScan: {
        visibleUrlTextCount: 0,
      },
    };

    const report = await buildProductValueReviewPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("product_value_review_ready_for_ceo_review_no_live_changes");
    expect(report.executiveSummary.productValueReviewPassed).toBe(true);
    expect(report.executiveSummary.readyGateCount).toBe(7);
    expect(report.executiveSummary.blockedGateCount).toBe(0);
  });

  test("renders markdown without leaking exact URLs", async () => {
    const reports = await baseReports({
      shopifyText: "<p>pendiente de conexion https://secret.example/link</p>",
    });
    const report = await buildProductValueReviewPacket({
      ...reports,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Product/value review passed: false");
    expect(markdown).toContain("[redacted_url]");
    expect(markdown).not.toContain("https://secret.example/link");
  });
});
