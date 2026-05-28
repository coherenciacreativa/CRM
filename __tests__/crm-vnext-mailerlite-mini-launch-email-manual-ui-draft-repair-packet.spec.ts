import { describe, expect, test } from "vitest";

import {
  buildRepairPacket,
  manualUiReceiptClosed,
  parseArgs,
  renderMarkdown,
  repairableDraftsFrom,
  safetyClosedInRealQa,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-draft-repair-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const payloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch,
  payloads: [
    {
      step: 1,
      role: "delivery_and_orientation",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E01",
      subject: "Tu lectura: qué tipo de descanso está pidiendo tu mente",
      preheader: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea.",
      contentBlocks: [
        { id: "email_1_paragraph_2", type: "paragraph", text: "Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte. Es una pista pequeña: una manera de mirar por dónde podría entrar mejor el descanso en este momento de tu vida." },
        { id: "email_1_paragraph_3", type: "paragraph", text: "La mente no siempre baja revoluciones por el mismo camino. Para algunas personas ayuda abrir espacio; para otras, volver al cuerpo, ordenar un límite o darse permiso sin convertir el descanso en otra tarea pendiente." },
        { id: "email_1_paragraph_4", type: "paragraph", text: "Te dejo tu lectura y una práctica breve para probar hoy. Léela con curiosidad, sin buscar hacerlo perfecto. Si algo resuena, toma eso como punto de partida." },
        {
          id: "email_1_cta",
          type: "cta",
          text: "Ver mi lectura y práctica",
          destination: "result_or_resource_link_placeholder",
          placeholder: {
            value: "result_or_resource_link_placeholder",
          },
        },
      ],
    },
    { step: 2, role: "practice_or_value", mailerLiteAssetNameDraft: "ML Draft · descanso · E02", contentBlocks: [] },
    { step: 3, role: "story_or_editorial_depth", mailerLiteAssetNameDraft: "ML Draft · descanso · E03", contentBlocks: [] },
    { step: 4, role: "invitation_or_feedback", mailerLiteAssetNameDraft: "ML Draft · descanso · E04", contentBlocks: [] },
  ],
};

const realMailerLiteRenderQa = {
  status: "mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes",
  executiveSummary: {
    expectedDraftCount: 4,
    draftCount: 4,
    allDraftsPreviewed: true,
    allRequiredContentExact: false,
    allSafetyGatesClosed: true,
    contentMismatchCount: 1,
    safetyMismatchCount: 0,
  },
  drafts: [
    {
      step: 1,
      role: "delivery_and_orientation",
      campaignId: "188672517160830964",
      expectedName: "ML Draft · descanso · E01",
      observedName: "ML Draft · descanso · E01",
      subject: { expected: "Tu lectura: qué tipo de descanso está pidiendo tu mente", observed: "Tu lectura: qué tipo de descanso está pidiendo tu mente", matches: true },
      preheader: { expected: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea.", observed: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea.", matches: true },
      content: {
        missingRequiredFragments: [
          { id: "email_1_paragraph_2", type: "paragraph", expected: "Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte. Es una pista pequeña: una manera de mirar por dónde podría entrar mejor el descanso en este momento de tu vida.", normalizedPresent: false },
          { id: "email_1_paragraph_3", type: "paragraph", expected: "La mente no siempre baja revoluciones por el mismo camino. Para algunas personas ayuda abrir espacio; para otras, volver al cuerpo, ordenar un límite o darse permiso sin convertir el descanso en otra tarea pendiente.", normalizedPresent: false },
          { id: "email_1_paragraph_4", type: "paragraph", expected: "Te dejo tu lectura y una práctica breve para probar hoy. Léela con curiosidad, sin buscar hacerlo perfecto. Si algo resuena, toma eso como punto de partida.", normalizedPresent: false },
          { id: "email_1_cta", type: "cta", expected: "Ver mi lectura y práctica", normalizedPresent: false },
        ],
      },
      safetyChecks: {
        allSafetyGatesClosed: true,
        failedSafetyChecks: [],
      },
    },
    { step: 2, content: { missingRequiredFragments: [] }, safetyChecks: { allSafetyGatesClosed: true, failedSafetyChecks: [] }, subject: { matches: true }, preheader: { matches: true } },
    { step: 3, content: { missingRequiredFragments: [] }, safetyChecks: { allSafetyGatesClosed: true, failedSafetyChecks: [] }, subject: { matches: true }, preheader: { matches: true } },
    { step: 4, content: { missingRequiredFragments: [] }, safetyChecks: { allSafetyGatesClosed: true, failedSafetyChecks: [] }, subject: { matches: true }, preheader: { matches: true } },
  ],
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    schedulesCreated: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    shopifyLiveApiCalled: false,
    crmLiveApiCalled: false,
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    scoringMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const manualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    outboxCountAfterBuild: 0,
  },
  draftReceipts: [1, 2, 3, 4].map((step) => ({
    step,
    uiVisibleInDrafts: true,
    contentCopiedFromLocalHtmlPath: true,
    noRecipientsSelectedChecked: true,
    noGroupsOrSegmentsSelectedChecked: true,
    noWorkflowOrAutomationAttachedChecked: true,
    notScheduledChecked: true,
    notSentChecked: true,
  })),
  stillClosedAfterThisReceipt: ["seed_send_or_test_send"],
  safety: {
    sendsPerformed: false,
    schedulesCreated: false,
    subscribersReadOrAssigned: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const seedTestQaPacket = {
  status: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
  readiness: {
    canAskSeedSendApprovalNow: false,
    machineBlockersBeforeSeedSendApprovalRequest: [
      "real_mailerlite_render_qa_not_green:mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes",
      "exact_seed_recipient_missing",
    ],
  },
};

describe("CRM vNext MailerLite mini-launch manual UI draft repair packet", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs(["--out", "/tmp/repair.json", "--markdown-out", "/tmp/repair.md"]);

    expect(parsed.realMailerLiteRenderQa).toContain("mailerlite_mini_launch_real_mailerlite_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.payloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.manualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.seedTestQaPacket).toContain("mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/repair.json");
    expect(parsed.markdownOut).toBe("/tmp/repair.md");
  });

  test("identifies the single repairable Email 1 target from real QA and payload manifest", () => {
    const { repairs, blockers } = repairableDraftsFrom({
      realQa: realMailerLiteRenderQa,
      manifest: payloadManifest,
    });

    expect(blockers).toEqual([]);
    expect(repairs).toHaveLength(1);
    expect(repairs[0]).toMatchObject({
      step: 1,
      campaignId: "188672517160830964",
      missingFragmentCount: 4,
    });
    expect(repairs[0].missingFragments.map((fragment) => fragment.id)).toEqual([
      "email_1_paragraph_2",
      "email_1_paragraph_3",
      "email_1_paragraph_4",
      "email_1_cta",
    ]);
  });

  test("builds a ready exact-approval packet without opening any live gate", () => {
    const packet = buildRepairPacket({
      realMailerLiteRenderQa,
      payloadManifest,
      manualUiBuildReceipt,
      seedTestQaPacket,
      sourceDigests: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.status).toBe("mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.ok).toBe(true);
    expect(packet.decision.canAskAlejandroForApproval).toBe(true);
    expect(packet.decision.canRepairNow).toBe(false);
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toContain("campaña 188672517160830964");
    expect(packet.decision.exactApprovalPhrase).toContain("result_or_resource_link_placeholder");
    expect(packet.decision.stillClosedEvenAfterApproval).toContain("send_email_or_test_email");
    expect(packet.executiveSummary).toMatchObject({
      targetDraftCount: 1,
      missingFragmentCount: 4,
      openLiveMutationGateCount: 0,
      seedTestQaCanAskApprovalNow: false,
    });
    expect(packet.safety).toMatchObject({
      localOnly: true,
      browserOpened: false,
      mailerLiteApiCalledByThisPacket: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
    expect(markdown).toContain("Mini-Launch Manual UI Draft Repair Packet");
    expect(markdown).toContain("Exact Approval Phrase");
  });

  test("turns reference-only when real MailerLite QA is already green", () => {
    const packet = buildRepairPacket({
      realMailerLiteRenderQa: {
        ...realMailerLiteRenderQa,
        status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
        executiveSummary: {
          ...realMailerLiteRenderQa.executiveSummary,
          allRequiredContentExact: true,
          contentMismatchCount: 0,
        },
        drafts: realMailerLiteRenderQa.drafts.map((draft) => ({
          ...draft,
          content: {
            ...draft.content,
            missingRequiredFragments: [],
          },
        })),
      },
      payloadManifest,
      manualUiBuildReceipt,
      seedTestQaPacket,
      sourceDigests: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed");
    expect(packet.ok).toBe(true);
    expect(packet.decision.canAskAlejandroForApproval).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBeNull();
    expect(packet.executiveSummary.targetDraftCount).toBe(0);
    expect(packet.executiveSummary.missingFragmentCount).toBe(0);
    expect(packet.blockers).toEqual([]);
  });

  test("blocks repair if real MailerLite QA has an open safety mismatch", () => {
    const packet = buildRepairPacket({
      realMailerLiteRenderQa: {
        ...realMailerLiteRenderQa,
        executiveSummary: {
          ...realMailerLiteRenderQa.executiveSummary,
          allSafetyGatesClosed: false,
          safetyMismatchCount: 1,
        },
        safety: {
          ...realMailerLiteRenderQa.safety,
          sendsPerformed: true,
        },
      },
      payloadManifest,
      manualUiBuildReceipt,
      seedTestQaPacket,
      sourceDigests: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_manual_ui_draft_repair_packet_blocked_no_live_changes");
    expect(packet.decision.canAskAlejandroForApproval).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBeNull();
    expect(packet.blockers).toContain("real_qa_safety_gates_not_closed");
    expect(packet.blockers).toContain("real_qa_safety_mismatch_present");
  });

  test("does not treat green real QA as complete when local gates contradict safety", () => {
    const packet = buildRepairPacket({
      realMailerLiteRenderQa: {
        ...realMailerLiteRenderQa,
        status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
        executiveSummary: {
          ...realMailerLiteRenderQa.executiveSummary,
          allRequiredContentExact: true,
          contentMismatchCount: 0,
        },
        drafts: realMailerLiteRenderQa.drafts.map((draft) => ({
          ...draft,
          content: {
            ...draft.content,
            missingRequiredFragments: [],
          },
        })),
      },
      payloadManifest,
      manualUiBuildReceipt: {
        ...manualUiBuildReceipt,
        safety: {
          ...manualUiBuildReceipt.safety,
          workflowMutationsPerformed: true,
        },
      },
      seedTestQaPacket,
      sourceDigests: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_manual_ui_draft_repair_packet_blocked_no_live_changes");
    expect(packet.ok).toBe(false);
    expect(packet.decision.canAskAlejandroForApproval).toBe(false);
    expect(packet.blockers).toContain("manual_ui_build_receipt_not_closed:manual_ui_build_receipt_executed_drafts_created_no_sends");
  });

  test("recognizes closed manual UI receipt and real QA safety", () => {
    expect(manualUiReceiptClosed(manualUiBuildReceipt)).toBe(true);
    expect(safetyClosedInRealQa(realMailerLiteRenderQa)).toBe(true);
  });
});
