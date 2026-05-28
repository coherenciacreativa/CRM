import { describe, expect, test } from "vitest";

import {
  buildManualUiExecutionKit,
  buildReceiptTemplate,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateSourcePacket,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-execution-kit.mjs";

const exactApprovalPhrase =
  "Apruebo construir manualmente en MailerLite UI únicamente estos 4 borradores del mini-lanzamiento Inteligencia para descansar, copiando el contenido desde los HTML locales del paquete manual UI, usando placeholders inertes (result_or_resource_link_placeholder, practice_link_placeholder, editorial_note_link_placeholder), sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.";

const targetDrafts = [
  {
    step: 1,
    role: "delivery_and_orientation",
    draftName: "ML Draft · descanso · E01 Delivery orientation",
    subject: "Tu lectura de descanso",
    preheader: "Una entrada amable.",
    htmlPath: "/tmp/email-1.html",
    previewPath: "/tmp/email-1.png",
    localRenderReady: true,
    placeholderValues: ["result_or_resource_link_placeholder"],
    replyCta: false,
    stillClosed: ["send_or_schedule"],
  },
  {
    step: 2,
    role: "practice_or_value",
    draftName: "ML Draft · descanso · E02 Practice",
    subject: "Una practica breve",
    preheader: "Sin hacerlo perfecto.",
    htmlPath: "/tmp/email-2.html",
    previewPath: "/tmp/email-2.png",
    localRenderReady: true,
    placeholderValues: ["practice_link_placeholder"],
    replyCta: false,
    stillClosed: ["send_or_schedule"],
  },
  {
    step: 3,
    role: "story_or_editorial_depth",
    draftName: "ML Draft · descanso · E03 Editorial depth",
    subject: "El descanso tambien pide criterio",
    preheader: "Una nota breve.",
    htmlPath: "/tmp/email-3.html",
    previewPath: "/tmp/email-3.png",
    localRenderReady: true,
    placeholderValues: ["editorial_note_link_placeholder"],
    replyCta: false,
    stillClosed: ["send_or_schedule"],
  },
  {
    step: 4,
    role: "invitation_or_feedback",
    draftName: "ML Draft · descanso · E04 Feedback invitation",
    subject: "Que notaste",
    preheader: "Una pregunta pequena.",
    htmlPath: "/tmp/email-4.html",
    previewPath: "/tmp/email-4.png",
    localRenderReady: true,
    placeholderValues: [],
    replyCta: true,
    stillClosed: ["send_or_schedule"],
  },
];

const localFileEvidence = targetDrafts.flatMap((target) => [
  {
    path: target.htmlPath,
    kind: `email_${target.step}_html`,
    present: true,
    nonEmpty: true,
    sizeBytes: 1200 + target.step,
    blocker: null,
  },
  {
    path: target.previewPath,
    kind: `email_${target.step}_preview`,
    present: true,
    nonEmpty: true,
    sizeBytes: 4200 + target.step,
    blocker: null,
  },
]);

const manualUiBuilderPacket = {
  status: "mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  executiveSummary: {
    targetDraftCount: 4,
    htmlSourceCount: 4,
    localRenderReadyCount: 4,
    advancedPlanApiBlockerConfirmed: true,
    apiAssetMutationCount: 0,
    canAskManualUiApprovalNow: true,
    canUseManualUiNow: false,
    canSendNow: false,
    openLiveMutationGateCount: 0,
  },
  manualUiApprovalBoundary: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canUseBrowserNow: false,
    canCreateOrEditDraftsNow: false,
    exactApprovalPhrase,
    allowedAfterExactApproval: [
      "open_mailerlite_ui_manually_prefer_safari",
      "create_or_edit_exactly_4_named_draft_campaigns_only",
    ],
    stillClosedEvenAfterApproval: [
      "seed_send_or_test_send",
      "workflow_or_automation_attachment",
      "subscriber_read_assignment_or_import",
      "group_creation_or_assignment",
    ],
  },
  manualUiTargetDrafts: targetDrafts,
  operatingPolicy: {
    status: "manual_ui_now_advanced_api_later_when_volume_justifies",
    futureAdvancedApiUpgradeTriggers: [
      "mini_launches_become_frequent_enough_that_manual_ui_is_a_bottleneck",
      "active_subscriber_tier_exceeds_2500_or_pricing_tier_requires_a_fresh_plan_review",
    ],
  },
  safety: {
    browserOpened: false,
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch manual UI execution kit", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/kit.json", "--markdown-out", "/tmp/kit.md"]);

    expect(parsed.manualUiBuilderPacket).toContain(
      "mailerlite_mini_launch_email_manual_ui_builder_packet_inteligencia_descansar_2026-05-28.json",
    );
    expect(parsed.out).toBe("/tmp/kit.json");
    expect(parsed.markdownOut).toBe("/tmp/kit.md");
  });

  test("builds a ready local-only execution kit without opening UI", () => {
    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket,
      localFileEvidence,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(kit.status).toBe("mini_launch_email_manual_ui_execution_kit_ready_no_live_changes");
    expect(kit.executiveSummary).toMatchObject({
      targetDraftCount: 4,
      htmlSourceReadyCount: 4,
      previewReadyCount: 4,
      exactApprovalPhrasePresent: true,
      preferredUiBrowser: "Safari",
      executionKitIsApprovalByItself: false,
      canOpenBrowserNow: false,
      canCreateOrEditDraftsNow: false,
      canSendNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(kit.executionBoundary.exactApprovalPhraseRequired).toBe(exactApprovalPhrase);
    expect(kit.operatorRoute.reason).toContain("Growing Business");
    expect(kit.operatorRoute.futureAdvancedApiUpgradeTriggers).toContain(
      "active_subscriber_tier_exceeds_2500_or_pricing_tier_requires_a_fresh_plan_review",
    );
    expect(kit.freshEvidenceBeforeOpeningUi.find((item) => item.id === "exact_approval_intake")).toMatchObject({
      status: "not_satisfied_by_this_kit",
      required: true,
    });
  });

  test("creates per-draft UI steps and receipt slots", () => {
    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket,
      localFileEvidence,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(kit.perDraftSteps).toHaveLength(4);
    expect(kit.perDraftSteps[0].uiChecklist.join(" ")).toContain("set campaign draft name exactly");
    expect(kit.perDraftSteps[0].uiChecklist.join(" ")).toContain("do not select recipients");
    expect(kit.perDraftSteps[0].htmlFileEvidence).toMatchObject({
      present: true,
      nonEmpty: true,
    });
    expect(kit.perDraftSteps[3].uiChecklist.join(" ")).toContain("reply CTA only");
    expect(kit.postBuildReceiptTemplate).toMatchObject({
      status: "manual_ui_build_receipt_template_not_executed",
      executed: false,
      createdOrEditedDraftCount: 0,
      sendCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupAssignmentCount: 0,
      workflowAttachmentCount: 0,
      scheduleCount: 0,
    });
    expect(kit.postBuildReceiptTemplate.draftReceipts).toHaveLength(4);
    expect(buildReceiptTemplate(kit.perDraftSteps).requiredNoLiveEvidence).toContain("no_test_send_or_public_send");
  });

  test("keeps safety closed and renders markdown hard stops", () => {
    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket,
      localFileEvidence,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(kit);

    expect(buildSafety()).toMatchObject({
      browserOpened: false,
      computerUseStarted: false,
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
    expect(markdown).toContain("Manual UI Execution Kit");
    expect(markdown).toContain("Can open browser now: false");
    expect(markdown).toContain("Browser: Safari");
    expect(markdown).toContain(exactApprovalPhrase);
    expect(markdown).toContain("Sin navegador abierto");
  });

  test("blocks when the source packet is not ready or self-opens draft execution", () => {
    expect(validateSourcePacket({
      packet: {
        ...manualUiBuilderPacket,
        status: "blocked",
      },
      targetDrafts,
      localFileEvidence,
    })).toContain("manual_ui_builder_packet_not_ready:blocked");

    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket: {
        ...manualUiBuilderPacket,
        manualUiApprovalBoundary: {
          ...manualUiBuilderPacket.manualUiApprovalBoundary,
          canCreateOrEditDraftsNow: true,
        },
      },
      localFileEvidence,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(kit.status).toBe("mini_launch_email_manual_ui_execution_kit_blocked_no_live_changes");
    expect(kit.blockers).toContain("boundary_draft_gate_unexpectedly_open");
  });

  test("blocks when local HTML or preview evidence is missing", () => {
    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket,
      localFileEvidence: [
        ...localFileEvidence.slice(0, -1),
        {
          path: "/tmp/email-4.png",
          kind: "email_4_preview",
          present: false,
          nonEmpty: false,
          sizeBytes: null,
          blocker: "email_4_preview_file_missing",
        },
      ],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(kit.ok).toBe(false);
    expect(kit.blockers).toContain("email_4_preview_file_missing");
    expect(kit.freshEvidenceBeforeOpeningUi.find((item) => item.id === "local_render_previews_exist")?.status).toBe("blocked");
  });

  test("blocks if no local file evidence was collected", () => {
    const kit = buildManualUiExecutionKit({
      manualUiBuilderPacket,
      localFileEvidence: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(kit.ok).toBe(false);
    expect(kit.blockers).toContain("target_1_html_evidence_missing");
    expect(kit.blockers).toContain("target_4_preview_evidence_missing");
  });
});
