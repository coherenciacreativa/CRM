import { describe, expect, test } from "vitest";

import {
  approvalStatusFor,
  buildHtmlForPayload,
  buildRunFromState,
  buildTargetPlan,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  validateSourceReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-asset-build.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const exactApprovalPhrase =
  "Apruebo SOLO crear/editar como borradores en MailerLite los 4 assets del mini-lanzamiento Inteligencia para descansar listados en este paquete, usando placeholders inertes (result_or_resource_link_placeholder, practice_link_placeholder, editorial_note_link_placeholder), sin enviar correos, sin publicar, sin workflows, sin subscribers, sin crear grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.";

const payloads = [
  {
    step: 1,
    role: "delivery_and_orientation",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
    subject: "Tu lectura de descanso",
    preheader: "Una entrada amable.",
    contentBlocks: [
      { id: "email_1_preheader", type: "preheader", text: "Una entrada amable." },
      { id: "email_1_greeting", type: "greeting", text: "Hola," },
      { id: "email_1_paragraph_1", type: "paragraph", text: "Gracias por hacer el quiz." },
      {
        id: "email_1_cta",
        type: "cta",
        text: "Ver mi lectura",
        destination: "result_or_resource_link_placeholder",
        placeholder: {
          key: "result_or_resource_link",
          value: "result_or_resource_link_placeholder",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
      { id: "email_1_closing", type: "closing", text: "Un abrazo,\nAlejandro" },
      { id: "email_1_footer", type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
    cta: {
      destinationType: "inert_url_placeholder",
      placeholder: {
        value: "result_or_resource_link_placeholder",
      },
    },
    hardExclusions: ["send_email", "attach_workflow_or_automation", "read_or_assign_subscribers"],
    liveActionAllowedNow: false,
  },
  {
    step: 2,
    role: "practice_or_value",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
    subject: "Una practica breve",
    preheader: "Sin hacerlo perfecto.",
    contentBlocks: [{ type: "paragraph", text: "Una practica pequeña." }],
    cta: { destinationType: "inert_url_placeholder", placeholder: { value: "practice_link_placeholder" } },
    hardExclusions: ["send_email"],
    liveActionAllowedNow: false,
  },
  {
    step: 3,
    role: "story_or_editorial_depth",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E03 Editorial depth",
    subject: "El descanso tambien pide criterio",
    preheader: "Una nota breve.",
    contentBlocks: [{ type: "paragraph", text: "Una nota para mirar con honestidad." }],
    cta: { destinationType: "inert_url_placeholder", placeholder: { value: "editorial_note_link_placeholder" } },
    hardExclusions: ["send_email"],
    liveActionAllowedNow: false,
  },
  {
    step: 4,
    role: "invitation_or_feedback",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E04 Feedback invitation",
    subject: "Que notaste",
    preheader: "Una pregunta pequena.",
    contentBlocks: [{ type: "paragraph", text: "Puedes responder con una linea." }],
    cta: { destinationType: "reply_to_email", placeholder: null },
    hardExclusions: ["send_email"],
    liveActionAllowedNow: false,
  },
];

const scopePacket = {
  ok: true,
  status: "email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes",
  launch,
  executiveSummary: {
    assetCount: 4,
    readyForSeedSendNow: false,
  },
  requestedFutureScope: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteBuildNow: false,
    exactApprovalPhrase,
    stillClosedEvenAfterThisApproval: [
      "seed_send_or_test_send",
      "workflow_or_automation_attachment",
      "subscriber_read_assignment_or_import",
      "group_creation_or_assignment",
      "shopify_preview_publish_or_form_connection",
      "crm_signal_ledger_append",
      "crm_card_write",
      "crm_scoring",
      "fact_store_write",
      "audience_launch",
    ],
  },
  assetBuildScope: {
    assets: payloads.map((payload) => ({
      step: payload.step,
      role: payload.role,
      mailerLiteAssetNameDraft: payload.mailerLiteAssetNameDraft,
      selectedSubject: payload.subject,
      selectedPreheader: payload.preheader,
    })),
  },
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const payloadManifest = {
  ok: true,
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch,
  approvalBoundary: {
    manifestIsApprovalByItself: false,
    exactAssetBuildApprovalStillRequired: true,
    canExecuteBuilderNow: false,
    canSendNow: false,
    canAttachWorkflowNow: false,
    canReadOrAssignSubscribersNow: false,
    canCreateGroupsNow: false,
    stillClosedEvenAfterAssetBuildApproval: [
      "seed_send_or_test_send",
      "workflow_or_automation_attachment",
      "subscriber_read_assignment_or_import",
      "group_creation_or_assignment",
      "shopify_preview_publish_or_form_connection",
      "crm_signal_ledger_append",
      "crm_card_write",
      "crm_scoring",
      "fact_store_write",
      "audience_launch",
    ],
  },
  payloads,
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch email asset build runner", () => {
  test("parses defaults and execute-only sender options", () => {
    const parsed = parseArgs([
      "--execute",
      "--approval-phrase",
      exactApprovalPhrase,
      "--from-email",
      "notasdealejandro@example.com",
      "--from-name",
      "Alejandro",
      "--reply-to",
      "reply@example.com",
      "--out",
      "/tmp/build.json",
      "--markdown-out",
      "/tmp/build.md",
    ]);

    expect(parsed.scopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.payloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.execute).toBe(true);
    expect(parsed.fromName).toBe("Alejandro");
    expect(parsed.out).toBe("/tmp/build.json");
  });

  test("normalizes exact approval but never requires it in dry-run", () => {
    const dryRunApproval = approvalStatusFor({
      execute: false,
      approvalPhrase: null,
      expectedPhrase: exactApprovalPhrase,
    });
    const executeApproval = approvalStatusFor({
      execute: true,
      approvalPhrase: `  ${exactApprovalPhrase}  `,
      expectedPhrase: exactApprovalPhrase,
    });

    expect(dryRunApproval).toMatchObject({
      ok: true,
      status: "dry_run_no_live_approval_required",
    });
    expect(executeApproval).toMatchObject({
      ok: true,
      status: "exact_approval_phrase_matched",
    });
    expect(normalizeApprovalPhrase("“hola”")).toBe('"hola"');
  });

  test("validates source packets only when every live gate remains closed", () => {
    const readiness = validateSourceReadiness({ scopePacket, payloadManifest });

    expect(readiness.ok).toBe(true);
    expect(readiness.payloads).toHaveLength(4);

    const blocked = validateSourceReadiness({
      scopePacket,
      payloadManifest: {
        ...payloadManifest,
        approvalBoundary: {
          ...payloadManifest.approvalBoundary,
          canSendNow: true,
        },
      },
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.issues).toContain("payload_manifest_send_gate_open");
  });

  test("plans create/update/block decisions from fresh campaign scan", () => {
    const plan = buildTargetPlan({
      payloadManifest,
      campaigns: [
        { id: "draft-2", name: "ML Draft · descanso · E02 Practice", status: "draft" },
        { id: "sent-3", name: "ML Draft · descanso · E03 Editorial depth", status: "sent" },
      ],
    });

    expect(plan[0]).toMatchObject({
      plannedOperation: "create_draft_campaign",
      existsInFreshScan: false,
    });
    expect(plan[1]).toMatchObject({
      plannedOperation: "update_existing_draft_campaign",
      draftCampaignId: "draft-2",
      allowedMutationInExecute: true,
    });
    expect(plan[2]).toMatchObject({
      plannedOperation: "block_existing_campaign_conflict",
      nonDraftCampaignCount: 1,
      allowedMutationInExecute: false,
    });
  });

  test("returns dry-run ready with read-only campaign scan and no asset mutation", () => {
    const run = buildRunFromState({
      scopePacket,
      payloadManifest,
      campaigns: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(run.status).toBe("dry_run_ready_for_exact_asset_build_approval");
    expect(run.ok).toBe(true);
    expect(run.freshScan).toMatchObject({
      campaignsRead: 0,
      createDraftCount: 4,
      updateDraftCount: 0,
      conflictCount: 0,
    });
    expect(run.decision.canExecute).toBe(false);
    expect(run.safety).toMatchObject({
      mailerLiteApiCalled: true,
      mailerLiteMutationsPerformed: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
      subscribersRead: false,
      groupsCreatedOrAssigned: false,
    });
  });

  test("blocks execute without exact approval and sender identity", () => {
    const run = buildRunFromState({
      scopePacket,
      payloadManifest,
      campaigns: [],
      execute: true,
      approvalPhrase: null,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(run.status).toBe("blocked_before_mini_launch_email_asset_build");
    expect(run.decision.blockers).toContain("blocked_missing_exact_approval_phrase");
    expect(run.decision.blockers).toContain("blocked_missing_verified_from_email");
    expect(run.decision.blockers).toContain("blocked_missing_from_name");
    expect(run.safety.mailerLiteMutationsPerformed).toBe(false);
  });

  test("allows execute planning only for exact phrase plus draft-only targets", () => {
    const run = buildRunFromState({
      scopePacket,
      payloadManifest,
      campaigns: [{ id: "draft-1", name: "ML Draft · descanso · E01 Delivery orientation", status: "draft" }],
      execute: true,
      approvalPhrase: exactApprovalPhrase,
      fromEmail: "notasdealejandro@example.com",
      fromName: "Alejandro",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(run.decision.canExecute).toBe(true);
    expect(run.status).toBe("execute_ready_but_not_performed");
    expect(run.freshScan).toMatchObject({
      createDraftCount: 3,
      updateDraftCount: 1,
      conflictCount: 0,
    });
  });

  test("renders safe HTML with inert CTA placeholder, not a live link", () => {
    const html = buildHtmlForPayload(payloads[0]);

    expect(html).toContain("result_or_resource_link_placeholder");
    expect(html).toContain("Gracias por hacer el quiz.");
    expect(html).not.toContain("<script");
  });

  test("renders reply CTA without exposing the raw reply destination token", () => {
    const html = buildHtmlForPayload({
      ...payloads[3],
      contentBlocks: [
        { type: "paragraph", text: "Puedes responder con una linea." },
        { type: "reply_cta", text: "Responder con una linea", destination: "reply" },
      ],
    });

    expect(html).toContain("Responder con una linea");
    expect(html).not.toContain('<span class="placeholder-note">reply</span>');
    expect(html).not.toContain(">reply<");
  });

  test("renders markdown with all closed gates", () => {
    const run = buildRunFromState({
      scopePacket,
      payloadManifest,
      campaigns: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(run);

    expect(markdown).toContain("Mini-Launch Email Asset Build Runner");
    expect(markdown).toContain("No campaigns scheduled or sent");
    expect(markdown).toContain("No subscribers read, printed, imported or assigned");
    expect(markdown).toContain("No groups created or assigned");
    expect(markdown).toContain("No Shopify/CRM live mutations");
  });

  test("records sanitized MailerLite validation details in failed execution reports", () => {
    const run = buildRunFromState({
      scopePacket,
      payloadManifest,
      campaigns: [],
      execute: true,
      approvalPhrase: exactApprovalPhrase,
      fromEmail: "notasdealejandro@example.com",
      fromName: "Alejandro",
      generatedAt: "2026-05-28T00:00:00.000Z",
      assetMutations: [],
      errors: [{
        step: 1,
        name: "ML Draft · descanso · E01 Delivery orientation",
        reason: "mailerlite_validation_failed",
        status: 422,
        details: [{
          field: "emails.0.content",
          message: "The content field requires a paid custom HTML editor plan.",
        }],
      }],
    });

    expect(run.status).toBe("failed_during_mini_launch_email_asset_build");
    expect(run.errors[0].details).toEqual([{
      field: "emails.0.content",
      message: "The content field requires a paid custom HTML editor plan.",
    }]);
    expect(run.safety.mailerLiteMutationsPerformed).toBe(false);
  });
});
