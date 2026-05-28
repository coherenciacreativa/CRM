import { describe, expect, test } from "vitest";

import {
  buildManualUiBuilderPacket,
  exactApprovalPhraseFor,
  executionHasAdvancedPlanContentBlocker,
  parseArgs,
  renderMarkdown,
  targetRowsFrom,
  validateReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-builder-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const payloads = [
  {
    step: 1,
    role: "delivery_and_orientation",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
    subject: "Tu lectura de descanso",
    preheader: "Una entrada amable.",
    cta: {
      destinationType: "inert_url_placeholder",
      placeholder: { value: "result_or_resource_link_placeholder" },
    },
  },
  {
    step: 2,
    role: "practice_or_value",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
    subject: "Una practica breve",
    preheader: "Sin hacerlo perfecto.",
    cta: {
      destinationType: "inert_url_placeholder",
      placeholder: { value: "practice_link_placeholder" },
    },
  },
  {
    step: 3,
    role: "story_or_editorial_depth",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E03 Editorial depth",
    subject: "El descanso tambien pide criterio",
    preheader: "Una nota breve.",
    cta: {
      destinationType: "inert_url_placeholder",
      placeholder: { value: "editorial_note_link_placeholder" },
    },
  },
  {
    step: 4,
    role: "invitation_or_feedback",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E04 Feedback invitation",
    subject: "Que notaste",
    preheader: "Una pregunta pequena.",
    cta: { destinationType: "reply_to_email" },
  },
];

const payloadManifest = {
  ok: true,
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch,
  payloads,
  approvalBoundary: {
    canSendNow: false,
    canAttachWorkflowNow: false,
    canReadOrAssignSubscribersNow: false,
    canCreateGroupsNow: false,
  },
};

const renderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  launch,
  executiveSummary: {
    localRenderReady: true,
    publicUseReady: false,
    seedSendReady: false,
  },
  emailQa: payloads.map((payload) => ({
    step: payload.step,
    htmlPath: `/tmp/email-${payload.step}.html`,
    localRenderReady: true,
    renderPreviewNonEmpty: true,
    renderPreview: { path: `/tmp/email-${payload.step}.png` },
  })),
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
  },
};

const assetBuildDryRun = {
  status: "dry_run_ready_for_exact_asset_build_approval",
  freshScan: {
    createDraftCount: 4,
    updateDraftCount: 0,
    conflictCount: 0,
  },
  safety: {
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
  },
};

const assetBuildExecution = {
  status: "failed_during_mini_launch_email_asset_build",
  assetMutations: [],
  errors: [{
    step: 1,
    reason: "mailerlite_validation_failed",
    status: 422,
    details: [{
      field: "emails.0.content",
      message: "Content submission is only available on advanced plan.",
    }],
  }],
  safety: {
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch manual UI builder packet", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/manual.json", "--markdown-out", "/tmp/manual.md"]);

    expect(parsed.payloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.renderQa).toContain("mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.assetBuildExecution).toContain("mailerlite_mini_launch_email_asset_build_EXECUTED_retry_with_validation_detail_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/manual.json");
    expect(parsed.markdownOut).toBe("/tmp/manual.md");
  });

  test("detects the Advanced-plan API blocker and validates readiness", () => {
    expect(executionHasAdvancedPlanContentBlocker(assetBuildExecution)).toBe(true);

    const readiness = validateReadiness({
      payloadManifest,
      renderQa,
      assetBuildDryRun,
      assetBuildExecution,
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.payloads).toHaveLength(4);
    expect(readiness.renderRows).toHaveLength(4);
  });

  test("builds target rows from local HTML render QA evidence", () => {
    const rows = targetRowsFrom({ payloadManifest, renderQa });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      draftName: "ML Draft · descanso · E01 Delivery orientation",
      htmlPath: "/tmp/email-1.html",
      localRenderReady: true,
      placeholderValues: ["result_or_resource_link_placeholder"],
    });
    expect(rows[3].replyCta).toBe(true);
    expect(rows[3].stillClosed).toContain("send_or_schedule");
  });

  test("builds a manual UI approval boundary without opening the UI", () => {
    const packet = buildManualUiBuilderPacket({
      payloadManifest,
      renderQa,
      assetBuildDryRun,
      assetBuildExecution,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      targetDraftCount: 4,
      htmlSourceCount: 4,
      localRenderReadyCount: 4,
      advancedPlanApiBlockerConfirmed: true,
      apiAssetMutationCount: 0,
      canAskManualUiApprovalNow: true,
      canUseManualUiNow: false,
      canSendNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(packet.manualUiApprovalBoundary).toMatchObject({
      canAskAlejandroForApproval: true,
      packetIsApprovalByItself: false,
      canUseBrowserNow: false,
      canCreateOrEditDraftsNow: false,
    });
    expect(packet.manualUiApprovalBoundary.exactApprovalPhrase).toContain("Apruebo construir manualmente en MailerLite UI");
    expect(packet.manualUiApprovalBoundary.exactApprovalPhrase).toContain("sin subscribers");
    expect(packet.safety).toMatchObject({
      browserOpened: false,
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
    });
  });

  test("blocks if the API execution had partial mutations", () => {
    const packet = buildManualUiBuilderPacket({
      payloadManifest,
      renderQa,
      assetBuildDryRun,
      assetBuildExecution: {
        ...assetBuildExecution,
        assetMutations: [{ step: 1 }],
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_manual_ui_builder_packet_blocked_before_approval");
    expect(packet.blockers).toContain("asset_build_execution_has_partial_mutations");
    expect(packet.manualUiApprovalBoundary.canAskAlejandroForApproval).toBe(false);
  });

  test("renders markdown that cannot be mistaken for execution", () => {
    const packet = buildManualUiBuilderPacket({
      payloadManifest,
      renderQa,
      assetBuildDryRun,
      assetBuildExecution,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Manual UI Builder Fallback Packet");
    expect(markdown).toContain("Can use manual UI now: false");
    expect(markdown).toContain("Sin navegador abierto");
    expect(markdown).toContain("Sin MailerLite API calls");
  });

  test("builds exact phrase from target rows and placeholders", () => {
    const phrase = exactApprovalPhraseFor({
      launch,
      targetRows: targetRowsFrom({ payloadManifest, renderQa }),
      placeholders: ["result_or_resource_link_placeholder", "practice_link_placeholder"],
    });

    expect(phrase).toContain("estos 4 borradores");
    expect(phrase).toContain("result_or_resource_link_placeholder");
    expect(phrase).toContain("sin crear ni asignar grupos");
  });
});
