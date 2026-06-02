import { describe, expect, test } from "vitest";

import {
  SAFETY_GROUP_NAME,
  buildExactApprovalPhrase,
  buildPacket,
  buildReplacementTargets,
  nullAudienceLabCompleted,
  parseArgs as parseApprovalArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs";
import {
  buildFormBody,
  buildE01CanaryApprovalPhrase,
  buildPreflight,
  escapeHtmlAttribute,
  htmlStats,
  normalizeApprovalPhrase,
  parseArgs as parseCreateArgs,
} from "../scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs";

const finalHashes = {
  result_or_resource_link: "hash-result",
  practice_link: "hash-practice",
  editorial_note_link: "hash-editorial",
};

const correctionPreview = {
  status: "seed_inbox_correction_preview_ready_no_live_changes",
  launch: {
    id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    name: "Inteligencia para descansar",
  },
  executiveSummary: {
    finalPublicLinksReady: true,
    finalPublicLinkCount: 3,
    finalPublicUrlHashesByKey: finalHashes,
    publicAudienceSendUrlGateReady: false,
    exactUrlsStoredInReport: false,
    redactedPayloadManifestReady: true,
  },
  previewRows: [
    { step: 1, role: "delivery_and_orientation", subject: "S1", draftName: "Draft E01", finalPublicLinkKey: "result_or_resource_link" },
    { step: 2, role: "practice_or_value", subject: "S2", draftName: "Draft E02", finalPublicLinkKey: "practice_link" },
    { step: 3, role: "story_or_editorial_depth", subject: "S3", draftName: "Draft E03", finalPublicLinkKey: "editorial_note_link" },
    { step: 4, role: "invitation_or_feedback", subject: "S4", draftName: "Draft E04", finalPublicLinkKey: null },
  ],
  redactedPayloadManifest: {
    payloads: [
      { step: 1, role: "delivery_and_orientation", subject: "S1", mailerLiteAssetNameDraft: "Draft E01" },
      { step: 2, role: "practice_or_value", subject: "S2", mailerLiteAssetNameDraft: "Draft E02" },
      { step: 3, role: "story_or_editorial_depth", subject: "S3", mailerLiteAssetNameDraft: "Draft E03" },
      { step: 4, role: "invitation_or_feedback", subject: "S4", mailerLiteAssetNameDraft: "Draft E04" },
    ],
  },
};

const emailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    emailCount: 4,
    renderPreviewNonEmptyCount: 4,
    redCheckCount: 0,
    visibleLinkTokenHitCount: 0,
    plainTextFallbackLinkTokenHitCount: 0,
    publicUseReady: false,
    seedSendReady: false,
  },
  emailQa: [
    { step: 1, role: "delivery_and_orientation", subject: "S1", htmlPath: "/tmp/e01.html" },
    { step: 2, role: "practice_or_value", subject: "S2", htmlPath: "/tmp/e02.html" },
    { step: 3, role: "story_or_editorial_depth", subject: "S3", htmlPath: "/tmp/e03.html" },
    { step: 4, role: "invitation_or_feedback", subject: "S4", htmlPath: "/tmp/e04.html" },
  ],
};

const shopifyReceipt = {
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    previewRouteReady: true,
    targetLinkCount: 3,
    canUseForLocalCorrectionPreview: true,
    publicAudienceSendUrlGateReady: false,
  },
};

const nullAudienceLab = {
  ok: true,
  status: "mailerlite_api_null_audience_lab_completed_null_audience_recipe_found_no_sends",
  mode: "execute_requested",
  executiveSummary: {
    safetyGroupName: SAFETY_GROUP_NAME,
    safetyGroupActiveCountObserved: 0,
    readyToUseNullAudienceRecipeForRealDrafts: true,
    safeNullAudienceVariantCount: 2,
  },
  safety: {
    mailerLiteApiCalled: true,
    sendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    subscriberMutationsPerformed: false,
    workflowMutationsPerformed: false,
    realLaunchDraftsCreatedOrEdited: false,
  },
};

const realQa = {
  status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
  executiveSummary: {
    draftCount: 4,
    allDraftsPreviewed: true,
    allRequiredContentExact: true,
  },
  drafts: [
    { step: 1, campaignId: "c1", observedName: "Draft E01", subject: { expected: "S1" }, role: "delivery_and_orientation" },
    { step: 2, campaignId: "c2", observedName: "Draft E02", subject: { expected: "S2" }, role: "practice_or_value" },
    { step: 3, campaignId: "c3", observedName: "Draft E03", subject: { expected: "S3" }, role: "story_or_editorial_depth" },
    { step: 4, campaignId: "c4", observedName: "Draft E04", subject: { expected: "S4" }, role: "invitation_or_feedback" },
  ],
};

const htmlEvidenceByStep = new Map([
  [1, { sha256: "h1", chars: 1800, totalPlaceholderCount: 0, redactedFinalLinkTokenCount: 1, urlHashCount: 0 }],
  [2, { sha256: "h2", chars: 1700, totalPlaceholderCount: 0, redactedFinalLinkTokenCount: 1, urlHashCount: 0 }],
  [3, { sha256: "h3", chars: 1600, totalPlaceholderCount: 0, redactedFinalLinkTokenCount: 1, urlHashCount: 0 }],
  [4, { sha256: "h4", chars: 1500, totalPlaceholderCount: 0, redactedFinalLinkTokenCount: 0, urlHashCount: 0 }],
]);

describe("CRM vNext MailerLite Null Audience replacement route", () => {
  test("builds a local-only approval packet for four replacement drafts", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      shopifyPreviewRouteExecutionReceipt: shopifyReceipt,
      nullAudienceLab,
      realMailerLiteRenderQa: realQa,
      htmlEvidenceByStep,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.executiveSummary.canAskAlejandroForApproval).toBe(true);
    expect(packet.executiveSummary.replacementTargetCount).toBe(4);
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.decision.canCreateReplacementDraftsNow).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBe(buildExactApprovalPhrase());
    expect(packet.decision.exactApprovalPhrase).toContain("final_public_link_ready_redacted:*");
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("marks completed Null Audience lab evidence as safe recipe input", () => {
    expect(nullAudienceLabCompleted(nullAudienceLab)).toBe(true);
    expect(nullAudienceLabCompleted({
      ...nullAudienceLab,
      executiveSummary: { ...nullAudienceLab.executiveSummary, safetyGroupActiveCountObserved: 1 },
    })).toBe(false);
  });

  test("builds replacement targets without exposing source campaign IDs", () => {
    const targets = buildReplacementTargets({
      correctionPreview,
      emailRenderQa,
      realMailerLiteRenderQa: realQa,
      htmlEvidenceByStep,
    });

    expect(targets).toHaveLength(4);
    expect(targets[0].replacementDraftName).toBe("Draft E01 · API Null Audience CTA fallback repair");
    expect(targets[0].oldCampaignIdPresent).toBe(true);
    expect(targets[0].oldCampaignIdSha256).toBeTruthy();
    expect(targets[0]).not.toHaveProperty("oldCampaignId");
    expect(targets[0].exactUrlStoredInPacket).toBe(false);
  });

  test("preflight accepts empty safety group and unique replacement names", () => {
    const exactUrl = "https://example.test/result";
    const targets = [{
      step: 1,
      label: "E01",
      role: "delivery_and_orientation",
      subject: "S1",
      sourceCampaignId: "c1",
      sourceCampaignIdSha256: "hash-c1",
      replacementDraftName: "Draft E01 · API Null Audience CTA fallback repair",
      correctedHtml: "<p>final_public_link_ready_redacted:result_or_resource_link</p>".repeat(3),
      correctedHtmlPath: "/tmp/e01.html",
      correctedHtmlStats: htmlStats(`final_public_link_ready_redacted:result_or_resource_link`),
      finalPublicLinkKey: "result_or_resource_link",
      exactPreviewUrl: exactUrl,
      expectedFinalPublicUrlSha256: "84bf31001f25fa12068d8dc53ffb65a66f76cf0c9d608846d9879c756f67de70",
    }, {
      step: 4,
      label: "E04",
      role: "invitation_or_feedback",
      subject: "S4",
      sourceCampaignId: "c4",
      sourceCampaignIdSha256: "hash-c4",
      replacementDraftName: "Draft E04 · API Null Audience CTA fallback repair",
      correctedHtml: "<p>reply</p>".repeat(20),
      correctedHtmlPath: "/tmp/e04.html",
      correctedHtmlStats: htmlStats("<p>reply</p>".repeat(20)),
      finalPublicLinkKey: null,
      exactPreviewUrl: null,
      expectedFinalPublicUrlSha256: null,
    }];

    const preflight = buildPreflight({
      approvalPacket: {
        ok: true,
        status: "mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes",
        executiveSummary: {
          canAskAlejandroForApproval: true,
        },
        decision: {
          packetIsApprovalByItself: false,
          canCreateReplacementDraftsNow: false,
          exactApprovalPhrase: buildExactApprovalPhrase(),
        },
        safety: {
          mailerLiteApiCalled: false,
          mailerLiteMutationsPerformed: false,
          sendsPerformed: false,
          exactUrlsPrinted: false,
          tokensPrinted: false,
        },
      },
      targets,
      groups: [{ id: "group-null", name: SAFETY_GROUP_NAME, active_count: 0 }],
      campaigns: [],
      execute: true,
      approvalPhrase: buildExactApprovalPhrase(),
    });

    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.safetyGroupActiveCount).toBe(0);
    expect(preflight.blockers).toEqual(["target_count_not_4:2"]);
    expect(preflight.targetPlan[0].exactPreviewUrlSha256).toBe(targets[0].expectedFinalPublicUrlSha256);
    expect(preflight.targetPlan[0]._exactPreviewUrlForRun).toBe(exactUrl);
  });

  test("preflight accepts a fresh scoped approval phrase from the packet", () => {
    const scopedPhrase = buildExactApprovalPhrase({
      approvalScopeDescription: "el footer compacto canon",
    });
    const targets = [1, 2, 3, 4].map((step) => ({
      step,
      label: `E0${step}`,
      role: step === 4 ? "invitation_or_feedback" : "delivery_and_orientation",
      subject: `S${step}`,
      sourceCampaignId: `c${step}`,
      sourceCampaignIdSha256: `hash-c${step}`,
      replacementDraftName: `Draft E0${step} · API Null Audience compact footer canon`,
      correctedHtml: step === 4
        ? "<p>reply</p>".repeat(20)
        : `<p>final_public_link_ready_redacted:result_or_resource_link</p>`.repeat(3),
      correctedHtmlPath: `/tmp/e0${step}.html`,
      correctedHtmlStats: htmlStats(step === 4
        ? "<p>reply</p>".repeat(20)
        : "final_public_link_ready_redacted:result_or_resource_link"),
      finalPublicLinkKey: step === 4 ? null : "result_or_resource_link",
      exactPreviewUrl: step === 4 ? null : "https://example.test/result",
      expectedFinalPublicUrlSha256: step === 4
        ? null
        : "84bf31001f25fa12068d8dc53ffb65a66f76cf0c9d608846d9879c756f67de70",
    }));

    const preflight = buildPreflight({
      approvalPacket: {
        ok: true,
        status: "mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes",
        executiveSummary: {
          canAskAlejandroForApproval: true,
        },
        decision: {
          packetIsApprovalByItself: false,
          canCreateReplacementDraftsNow: false,
          exactApprovalPhrase: scopedPhrase,
        },
        safety: {
          mailerLiteApiCalled: false,
          mailerLiteMutationsPerformed: false,
          sendsPerformed: false,
          exactUrlsPrinted: false,
          tokensPrinted: false,
        },
      },
      targets,
      groups: [{ id: "group-null", name: SAFETY_GROUP_NAME, active_count: 0 }],
      campaigns: [],
      execute: true,
      approvalPhrase: scopedPhrase,
    });

    expect(scopedPhrase).toContain("para aplicar el footer compacto canon");
    expect(scopedPhrase).not.toBe(buildExactApprovalPhrase());
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.blockers).toEqual([]);
  });

  test("preflight supports the E01 canary approval without opening the full four-draft route", () => {
    const exactUrl = "https://example.test/result";
    const targets = [{
      step: 1,
      label: "E01",
      role: "delivery_and_orientation",
      subject: "S1",
      sourceCampaignId: "c1",
      sourceCampaignIdSha256: "hash-c1",
      replacementDraftName: "Draft E01 · API Null Audience visual signature canary",
      correctedHtml: "<p>final_public_link_ready_redacted:result_or_resource_link</p>".repeat(3),
      correctedHtmlPath: "/tmp/e01.html",
      correctedHtmlStats: htmlStats("final_public_link_ready_redacted:result_or_resource_link"),
      finalPublicLinkKey: "result_or_resource_link",
      exactPreviewUrl: exactUrl,
      expectedFinalPublicUrlSha256: "84bf31001f25fa12068d8dc53ffb65a66f76cf0c9d608846d9879c756f67de70",
    }];

    const preflight = buildPreflight({
      approvalPacket: {
        ok: true,
        status: "mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes",
        executiveSummary: {
          canAskAlejandroForApproval: true,
        },
        decision: {
          packetIsApprovalByItself: false,
          canCreateReplacementDraftsNow: false,
          exactApprovalPhrase: buildExactApprovalPhrase(),
        },
        safety: {
          mailerLiteApiCalled: false,
          mailerLiteMutationsPerformed: false,
          sendsPerformed: false,
          exactUrlsPrinted: false,
          tokensPrinted: false,
        },
      },
      targets,
      groups: [{ id: "group-null", name: SAFETY_GROUP_NAME, active_count: 0 }],
      campaigns: [],
      execute: true,
      approvalPhrase: buildE01CanaryApprovalPhrase(),
      targetLabels: ["E01"],
    });

    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.expectedTargetCount).toBe(1);
    expect(preflight.targetLabels).toEqual(["E01"]);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.targetPlan).toHaveLength(1);
    expect(preflight.targetPlan[0].label).toBe("E01");
  });

  test("form body assigns only the Null Audience group", () => {
    const body = buildFormBody({
      name: "Draft",
      subject: "Subject",
      fromName: "Sender",
      fromEmail: "sender@example.test",
      replyTo: "reply@example.test",
      content: "<p>Hello</p>",
      groupId: "group-null",
    });

    expect(body["groups[]"]).toEqual(["group-null"]);
    expect(Object.keys(body).some((key) => /subscriber|segment|workflow/i.test(key))).toBe(false);
  });

  test("escapes exact preview URLs before injecting them into href attributes", () => {
    expect(escapeHtmlAttribute('https://example.test/path?a=1&b="two"')).toBe(
      "https://example.test/path?a=1&amp;b=&quot;two&quot;",
    );
  });

  test("normalizes approval phrase and renders markdown without secrets", () => {
    expect(normalizeApprovalPhrase("  Apruebo   crear  ")).toBe("Apruebo crear");
    expect(parseApprovalArgs([]).out).toContain("mailerlite_mini_launch_null_audience_replacement_approval_packet");
    expect(parseCreateArgs([]).out).toContain("mailerlite_mini_launch_null_audience_replacement_execution_receipt");
    expect(parseCreateArgs(["--target-labels", "1"]).targetLabels).toEqual(["E01"]);

    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      shopifyPreviewRouteExecutionReceipt: shopifyReceipt,
      nullAudienceLab,
      realMailerLiteRenderQa: realQa,
      htmlEvidenceByStep,
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Exact Approval Phrase");
    expect(markdown).toContain("Exact URLs/tokens/sender values printed: false/false/false");
    expect(markdown).not.toContain("https://example.test");
  });
});
