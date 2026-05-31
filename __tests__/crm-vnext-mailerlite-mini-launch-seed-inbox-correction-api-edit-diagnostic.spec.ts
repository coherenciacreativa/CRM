import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  buildDiagnosticFromState,
  htmlStats,
  parseArgs,
  renderMarkdown,
  safetyForCampaign,
  targetRowsFrom,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-edit-diagnostic.mjs";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const resultUrl = "https://example.test/preview/result";
const practiceUrl = "https://example.test/preview/practice";
const editorialUrl = "https://example.test/preview/editorial";

const realQa = {
  status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  drafts: [
    { step: 1, campaignId: "campaign-e01", observedName: "ML Draft · descanso · E01" },
    { step: 2, campaignId: "campaign-e02", observedName: "ML Draft · descanso · E02" },
    { step: 3, campaignId: "campaign-e03", observedName: "ML Draft · descanso · E03" },
    { step: 4, campaignId: "campaign-e04", observedName: "ML Draft · descanso · E04" },
  ],
};

const executionKit = {
  status: "seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  perDraftSteps: [
    { step: 1, draftName: "ML Draft · descanso · E01", htmlPath: "/tmp/e01.html" },
    { step: 2, draftName: "ML Draft · descanso · E02", htmlPath: "/tmp/e02.html" },
    { step: 3, draftName: "ML Draft · descanso · E03", htmlPath: "/tmp/e03.html" },
    { step: 4, draftName: "ML Draft · descanso · E04", htmlPath: "/tmp/e04.html" },
  ],
};

const correctionPreview = {
  status: "seed_inbox_correction_preview_ready_no_live_changes",
  executiveSummary: {
    finalPublicUrlHashesByKey: {
      result_or_resource_link: sha256(resultUrl),
      practice_link: sha256(practiceUrl),
      editorial_note_link: sha256(editorialUrl),
    },
  },
};

const shopifyPreviewRouteExecutionReceipt = {
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    canUseForLocalCorrectionPreview: true,
    publicAudienceSendUrlGateReady: false,
  },
  targetLinks: [
    { key: "result_or_resource_link", url: resultUrl, urlSha256: sha256(resultUrl) },
    { key: "practice_link", url: practiceUrl, urlSha256: sha256(practiceUrl) },
    { key: "editorial_note_link", url: editorialUrl, urlSha256: sha256(editorialUrl) },
  ],
};

const safeCampaign = ({ id, name, content }: { id: string; name: string; content: string }) => ({
  id,
  name,
  status: "draft",
  type: "regular",
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  filter: null,
  has_basic_filter: false,
  missing_data: ["recipients"],
  warnings: [],
  can_be_scheduled: false,
  emails: [
    {
      id: `${id}-email`,
      from_name: "Alejandro",
      from: "sender@example.test",
      reply_to: "reply@example.test",
      content,
    },
  ],
});

const correctedHtmlByStep = new Map([
  [1, `<html><body><a href="${resultUrl}">Ver lectura</a></body></html>`],
  [2, `<html><body><a href="${practiceUrl}">Guardar practica</a></body></html>`],
  [3, `<html><body><a href="${editorialUrl}">Leer nota</a></body></html>`],
  [4, "<html><body>Responde a este correo.</body></html>"],
]);

const currentContentByStep = new Map([
  [1, `<html><body><a href="${resultUrl}">Ver lectura</a></body></html>`],
  [2, "<html><body>practice_link_placeholder</body></html>"],
  [3, "<html><body>editorial_note_link_placeholder</body></html>"],
  [4, "<html><body>Responde a este correo.</body></html>"],
]);

const campaignsById = new Map(realQa.drafts.map((draft) => {
  const content = currentContentByStep.get(draft.step) ?? "<html><body>old content</body></html>";
  return [
    draft.campaignId,
    safeCampaign({
      id: draft.campaignId,
      name: draft.observedName,
      content,
    }),
  ];
}));

describe("CRM vNext MailerLite mini-launch seed inbox correction API edit diagnostic", () => {
  test("normalizes parser defaults and rejects unsafe API bases", () => {
    const parsed = parseArgs(["--timeout-ms", "12000"]);
    expect(parsed.timeoutMs).toBe(12000);
    expect(parsed.apiBase).toBe("https://connect.mailerlite.com/api");
    expect(parsed.out).toContain("mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic");

    expect(() => parseArgs(["--api-base", "https://example.test/api"])).toThrow("unsafe_api_base_not_mailerlite");
  });

  test("redacts exact URLs by hashing and counts inert placeholders", () => {
    const stats = htmlStats(`<a href="${practiceUrl}">Practice</a> practice_link_placeholder`);

    expect(stats.totalPlaceholderCount).toBe(1);
    expect(stats.placeholderCounts.practice_link_placeholder).toBe(1);
    expect(stats.urlHashes).toContain(sha256(practiceUrl));
    expect(JSON.stringify(stats)).not.toContain(practiceUrl);
  });

  test("maps target rows from real MailerLite QA plus execution kit", () => {
    const rows = targetRowsFrom({ realQa, executionKit });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      step: 1,
      campaignId: "campaign-e01",
      draftName: "ML Draft · descanso · E01",
      htmlPath: "/tmp/e01.html",
    });
  });

  test("campaign safety blocks recipient filters and schedulable drafts", () => {
    const safe = safetyForCampaign(safeCampaign({
      id: "campaign-e01",
      name: "ML Draft · descanso · E01",
      content: "<p>current</p>",
    }));
    expect(safe.allClosed).toBe(true);

    const unsafe = safetyForCampaign({
      ...safeCampaign({ id: "campaign-e02", name: "ML Draft · descanso · E02", content: "<p>current</p>" }),
      has_basic_filter: true,
      filter: [],
      can_be_scheduled: true,
    });

    expect(unsafe.allClosed).toBe(false);
    expect(unsafe.failed).toEqual(expect.arrayContaining([
      "filter_absent_or_null",
      "no_basic_filter",
      "cannot_schedule_without_recipients",
    ]));
  });

  test("declares existing drafts ready only for a future guarded API edit approval", () => {
    const diagnostic = buildDiagnosticFromState({
      realQa,
      executionKit,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaignsById,
      correctedHtmlByStep,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(diagnostic.status).toBe("seed_inbox_correction_api_edit_diagnostic_ready_for_guarded_api_edit_approval_no_live_changes");
    expect(diagnostic.executiveSummary.apiEditCandidate).toBe(true);
    expect(diagnostic.apiEditBoundary.diagnosticIsApprovalByItself).toBe(false);
    expect(diagnostic.apiEditBoundary.canEditByApiNow).toBe(false);
    expect(diagnostic.apiEditBoundary.stillClosed).toContain("api_edit_without_a_new_exact_approval_phrase");
    expect(diagnostic.executiveSummary.allApiPayloadReady).toBe(true);
    expect(diagnostic.safety.mailerLiteMutationsPerformed).toBe(false);
    expect(JSON.stringify(diagnostic)).not.toContain(resultUrl);
    expect(JSON.stringify(diagnostic)).not.toContain(practiceUrl);
    expect(JSON.stringify(diagnostic)).not.toContain(editorialUrl);
  });

  test("blocks when Shopify exact URL does not match correction-preview hash for that step", () => {
    const mismatchedShopifyReceipt = {
      ...shopifyPreviewRouteExecutionReceipt,
      targetLinks: [
        { key: "result_or_resource_link", url: resultUrl, urlSha256: sha256(resultUrl) },
        { key: "practice_link", url: resultUrl, urlSha256: sha256(resultUrl) },
        { key: "editorial_note_link", url: editorialUrl, urlSha256: sha256(editorialUrl) },
      ],
    };

    const diagnostic = buildDiagnosticFromState({
      realQa,
      executionKit,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt: mismatchedShopifyReceipt,
      campaignsById,
      correctedHtmlByStep,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(diagnostic.executiveSummary.apiEditCandidate).toBe(false);
    expect(diagnostic.blockers).toContain("step_2_shopify_exact_preview_url_hash_mismatch:practice_link");
  });

  test("blocks when corrected HTML still contains inert placeholders", () => {
    const placeholderHtmlByStep = new Map(correctedHtmlByStep);
    placeholderHtmlByStep.set(3, "<html><body>editorial_note_link_placeholder</body></html>");

    const diagnostic = buildDiagnosticFromState({
      realQa,
      executionKit,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaignsById,
      correctedHtmlByStep: placeholderHtmlByStep,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(diagnostic.executiveSummary.apiEditCandidate).toBe(false);
    expect(diagnostic.blockers).toContain("step_3_corrected_html_still_contains_inert_placeholders");
  });

  test("markdown remains URL-redacted", () => {
    const diagnostic = buildDiagnosticFromState({
      realQa,
      executionKit,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaignsById,
      correctedHtmlByStep,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(diagnostic);

    expect(markdown).toContain("API edit candidate: true");
    expect(markdown).not.toContain(resultUrl);
    expect(markdown).not.toContain(practiceUrl);
    expect(markdown).not.toContain(editorialUrl);
  });
});
