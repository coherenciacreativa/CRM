import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildPublicSurfaceCopy,
  buildShopifyHandoffPacket,
  buildSuggestedShopifyFiles,
  flattenPublicCopy,
  inspectWebRepoReferences,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-shopify-handoff-packet.mjs";

const rehearsalPacket = {
  ok: true,
  status: "mini_launch_rehearsal_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  publicSurfaceDrafts: {
    landing: {
      h1Draft: "Inteligencia para descansar",
      subheadDraft: "Un test breve para reconocer que tipo de descanso esta pidiendo tu mente y recibir una practica pequena para empezar a abrir espacio.",
    },
    quiz: {
      completionMessageDraft: "Tu resultado no pretende encerrarte en una categoria. Es una lectura pequena para empezar a escucharte con mas precision.",
    },
  },
  quizModel: {
    questions: [
      { id: "q1", prompt: "Cuando por fin paras un momento, que aparece primero?", answerSignals: ["ruido_mental"] },
      { id: "q2", prompt: "Que parece necesitar mas tu sistema en estos dias?", answerSignals: ["espacio"] },
    ],
  },
};

const emailSequencePacket = {
  ok: true,
  status: "email_sequence_asset_packet_ready_for_brand_review_no_live_changes",
  launch: rehearsalPacket.launch,
};

const brandCandidateReviewPacket = {
  ok: true,
  status: "brand_candidate_review_packet_ready_no_live_changes",
  dictionaryState: {
    missingCandidateCount: 2,
  },
  candidateRows: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      layer: "Source",
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      layer: "Delivered",
    },
  ],
};

const webRepoInspection = {
  webRepo: "/Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite",
  referenceCount: 7,
  presentCount: 7,
  references: [
    {
      relativePath: "sections/landing-brujula-claridad.liquid",
      path: "/repo/sections/landing-brujula-claridad.liquid",
      present: true,
      chars: 1000,
      role: "landing precedent",
    },
  ],
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md",
    present: true,
    chars: 1000,
    consultedFor: "Shopify-first routing, fallback and live-publish boundaries",
  },
];

describe("CRM vNext MailerLite mini-launch Shopify handoff packet", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/shopify.json",
      "--markdown-out",
      "/tmp/shopify.md",
    ]);

    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.shopifyProtocol).toContain("SHOPIFY_PREVIEW_PROTOCOL.md");
    expect(parsed.webRepo).toContain("coherenciacreativa-shopifywebsite");
    expect(parsed.out).toBe("/tmp/shopify.json");
    expect(parsed.markdownOut).toBe("/tmp/shopify.md");
  });

  test("extracts launch and builds suggested Shopify file names", () => {
    const launch = launchFrom(rehearsalPacket, emailSequencePacket);
    const files = buildSuggestedShopifyFiles({ launch });

    expect(launch).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      resourceType: "quiz",
    });
    expect(files.map((file) => file.path)).toEqual([
      "sections/landing-inteligencia-para-descansar.liquid",
      "sections/result-inteligencia-para-descansar.liquid",
      "snippets/mailerlite-inteligencia-para-descansar-form.liquid",
      "templates/page.landing-inteligencia-para-descansar.json",
      "templates/page.result-inteligencia-para-descansar.json",
    ]);
    expect(files.every((file) => file.status === "suggested_not_created")).toBe(true);
  });

  test("builds public surfaces without internal implementation language", () => {
    const launch = launchFrom(rehearsalPacket, emailSequencePacket);
    const copy = buildPublicSurfaceCopy({ launch, rehearsalPacket });
    const publicText = flattenPublicCopy(copy);

    expect(copy.landing.h1).toBe("Inteligencia para descansar");
    expect(copy.quiz.questions).toHaveLength(2);
    expect(publicText).not.toMatch(/MailerLite|CRM|tag|launch_id|workflow|lead magnet|embudo/i);
    expect(publicText).not.toMatch(/\ba veces\b/i);
  });

  test("builds a local-only handoff packet with live gates closed", () => {
    const packet = buildShopifyHandoffPacket({
      rehearsalPacket,
      emailSequencePacket,
      brandCandidateReviewPacket,
      webRepoInspection,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("shopify_handoff_packet_ready_for_web_design_review_no_live_changes");
    expect(packet.readiness).toMatchObject({
      readyForWebDesignReviewNow: true,
      readyForShopifyRepoEditNow: false,
      readyForShopifyPreviewNow: false,
      readyForFormConnectionNow: false,
      readyForPublishNow: false,
    });
    expect(packet.publicCopyQa.scan.bannedTermHits).toEqual([]);
    expect(packet.safety).toMatchObject({
      shopifyRepoReadOnlyInspection: true,
      shopifyRepoFilesWritten: false,
      shopifyApiCalled: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
    });
  });

  test("keeps MailerLite form and group connection closed", () => {
    const packet = buildShopifyHandoffPacket({
      rehearsalPacket,
      emailSequencePacket,
      brandCandidateReviewPacket,
      webRepoInspection,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.formAndDataPlan.status).toBe("placeholder_only_no_live_form_connection");
    expect(packet.formAndDataPlan.mailerLiteGroupsRemainClosed).toMatchObject({
      sourceCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
      missingBrandCandidateCount: 2,
    });
    expect(packet.approvalGates.find((gate) => gate.id === "form_mailerlite_connection")).toMatchObject({
      currentStatus: "closed_until_brand_groups_and_mailerlite_approval",
      approvalNeededFromAlejandro: true,
    });
  });

  test("renders handoff markdown without authorizing Shopify work", () => {
    const packet = buildShopifyHandoffPacket({
      rehearsalPacket,
      emailSequencePacket,
      brandCandidateReviewPacket,
      webRepoInspection,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Shopify/Web Handoff Packet");
    expect(markdown).toContain("Ready for Shopify repo edit now: false");
    expect(markdown).toContain("sections/landing-inteligencia-para-descansar.liquid");
    expect(markdown).toContain("Sin archivos escritos en Shopify");
    expect(markdown).toContain("Sin conexion real de formulario");
  });

  test("inspects reference files in a web repo without writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "shopify-handoff-"));
    try {
      const files = [
        "assets/page-typography-harmony.css",
        "assets/mobile-polish.css",
        "sections/landing-brujula-claridad.liquid",
        "sections/guide-brujula-claridad.liquid",
        "snippets/mailerlite-brujula-claridad-form.liquid",
      ];
      for (const file of files) {
        const path = join(dir, file);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, "fixture", "utf8");
      }

      const inspection = await inspectWebRepoReferences(dir);

      expect(inspection.webRepo).toBe(dir);
      expect(inspection.referenceCount).toBe(7);
      expect(inspection.presentCount).toBe(5);
      expect(inspection.references.find((item) => item.relativePath === "sections/landing-brujula-claridad.liquid")).toMatchObject({
        present: true,
        role: "landing precedent",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
