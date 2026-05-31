import { describe, expect, test } from "vitest";

import { buildCorrectionInputsState } from "../scripts/crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs";
import {
  buildRedactedPayloadManifest,
  buildSeedInboxCorrectionPreview,
  buildSafety,
  parseArgs,
  redactPayloadForPreview,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview.mjs";

const payloads = [
  {
    step: 1,
    role: "delivery_and_orientation",
    mailerLiteAssetNameDraft: "ML Draft - E01",
    subject: "Tu lectura",
    preheader: "Una lectura pequena.",
    cta: {
      text: "Ver mi lectura",
      destination: "result_or_resource_link_placeholder",
      destinationType: "inert_url_placeholder",
      placeholder: {
        key: "result_or_resource_link",
        value: "result_or_resource_link_placeholder",
        status: "inert_placeholder_needs_future_exact_source",
      },
    },
    contentBlocks: [
      { type: "paragraph", text: "Gracias por hacer el quiz." },
      {
        type: "cta",
        text: "Ver mi lectura",
        destination: "result_or_resource_link_placeholder",
        placeholder: {
          key: "result_or_resource_link",
          value: "result_or_resource_link_placeholder",
        },
      },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 2,
    role: "practice_or_value",
    mailerLiteAssetNameDraft: "ML Draft - E02",
    subject: "Practica",
    cta: {
      text: "Guardar practica",
      destination: "practice_link_placeholder",
      destinationType: "inert_url_placeholder",
      placeholder: {
        key: "practice_link",
        value: "practice_link_placeholder",
      },
    },
    contentBlocks: [
      { type: "paragraph", text: "Una practica breve." },
      {
        type: "cta",
        text: "Guardar practica",
        destination: "practice_link_placeholder",
        placeholder: {
          key: "practice_link",
          value: "practice_link_placeholder",
        },
      },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 3,
    role: "story_or_editorial_depth",
    mailerLiteAssetNameDraft: "ML Draft - E03",
    subject: "Criterio",
    cta: {
      text: "Leer la nota",
      destination: "editorial_note_link_placeholder",
      destinationType: "inert_url_placeholder",
      placeholder: {
        key: "editorial_note_link",
        value: "editorial_note_link_placeholder",
      },
    },
    contentBlocks: [
      { type: "paragraph", text: "Una nota breve." },
      {
        type: "cta",
        text: "Leer la nota",
        destination: "editorial_note_link_placeholder",
        placeholder: {
          key: "editorial_note_link",
          value: "editorial_note_link_placeholder",
        },
      },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 4,
    role: "invitation_or_feedback",
    mailerLiteAssetNameDraft: "ML Draft - E04",
    subject: "Que notaste",
    cta: {
      text: "Responder",
      destination: "reply",
      destinationType: "reply_to_email",
      placeholder: null,
    },
    contentBlocks: [
      { type: "paragraph", text: "Responde con una linea." },
      { type: "reply_cta", text: "Responder", destination: "reply", placeholder: null },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
];

const payloadManifest = {
  schemaVersion: "payload-manifest-test",
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  executiveSummary: {
    payloadCount: 4,
    canExecuteBuilderNow: false,
  },
  payloads,
};

const correctionPlan = {
  status: "seed_inbox_correction_plan_ready_no_live_changes",
  launch: {
    id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    name: "Inteligencia para descansar",
  },
};

const correctionPayload = {
  finalPublicLinks: {
    result_or_resource_link: "https://example.com/result",
    practice_link: "https://example.com/practice",
    editorial_note_link: "https://example.com/editorial",
  },
  subscriptionReasonPolicy: "include_once_in_all_emails",
};

const correctionState = buildCorrectionInputsState({
  path: "/tmp/private/correction-inputs.json",
  read: {
    present: true,
    value: correctionPayload,
    error: null,
    chars: 200,
  },
});

describe("CRM vNext MailerLite mini-launch seed inbox correction preview", () => {
  test("normalizes args and defaults", () => {
    const parsed = parseArgs([
      "--payload-manifest",
      "/tmp/payload.json",
      "--correction-inputs-file",
      "/tmp/private/correction-inputs.json",
      "--launch-asset-manifest",
      "/tmp/asset-manifest.json",
      "--no-redacted-payload-manifest",
    ]);

    expect(parsed.payloadManifest).toBe("/tmp/payload.json");
    expect(parsed.correctionInputsFile).toBe("/tmp/private/correction-inputs.json");
    expect(parsed.launchAssetManifest).toBe("/tmp/asset-manifest.json");
    expect(parsed.writeRedactedPayloadManifest).toBe(false);
    expect(parsed.out).toContain("mailerlite_mini_launch_seed_inbox_correction_preview");
  });

  test("blocks safely when final links and policy are missing", () => {
    const missingState = buildCorrectionInputsState({
      path: "/tmp/private/correction-inputs.json",
      read: {
        present: false,
        value: null,
        error: null,
        chars: 0,
      },
    });
    const report = buildSeedInboxCorrectionPreview({
      payloadManifest,
      correctionPlan,
      correctionState: missingState,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(report.status).toBe("seed_inbox_correction_preview_blocked_missing_inputs_no_live_changes");
    expect(report.ok).toBe(false);
    expect(report.executiveSummary.redactedPayloadManifestReady).toBe(false);
    expect(report.blockers).toContain("correction_inputs_file_missing");
    expect(report.safety).toMatchObject({
      localOnly: true,
      exactUrlsStoredInReport: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("names Web public URL wait when asset manifest owns the link slots", () => {
    const manifestState = buildCorrectionInputsState({
      path: "/tmp/private/correction-inputs.json",
      read: {
        present: false,
        value: null,
        error: null,
        chars: 0,
      },
      launchAssetManifestRead: {
        present: true,
        value: {
          status: "mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes",
          executiveSummary: {
            finalPublicLinksReady: false,
            requiresAlejandroManualLinks: false,
            subscriptionReasonPolicy: "remove_custom_line_and_rely_on_platform_footer",
          },
          finalPublicLinks: {
            status: "system_pending_public_urls_no_live_changes",
            blockers: ["public_shopify_url_missing"],
          },
          subscriptionReasonPolicy: {
            policy: "remove_custom_line_and_rely_on_platform_footer",
          },
        },
        error: null,
        chars: 300,
      },
      launchAssetManifestFile: "/tmp/asset-manifest.json",
    });
    const report = buildSeedInboxCorrectionPreview({
      payloadManifest,
      correctionPlan,
      correctionState: manifestState,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(report.status).toBe("seed_inbox_correction_preview_waiting_for_web_public_urls_no_live_changes");
    expect(report.executiveSummary.subscriptionReasonPolicyReady).toBe(true);
    expect(report.executiveSummary.subscriptionReasonPolicy).toBe("remove_custom_line_and_rely_on_platform_footer");
    expect(report.executiveSummary.nextSafeAction).toBe(
      "wait_for_web_or_shopify_publish_receipt_public_urls_without_approval_or_execution",
    );
    expect(manifestState.finalPublicLinks.humanInputRequired).toBe(false);
  });

  test("builds redacted corrected payload preview without storing exact URLs", () => {
    const report = buildSeedInboxCorrectionPreview({
      payloadManifest,
      correctionPlan,
      correctionState,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("seed_inbox_correction_preview_ready_no_live_changes");
    expect(report.ok).toBe(true);
    expect(report.executiveSummary.finalPublicLinksReady).toBe(true);
    expect(report.executiveSummary.subscriptionReasonPolicy).toBe("include_once_in_all_emails");
    expect(report.executiveSummary.canAskMailerLiteUiEditApprovalNow).toBe(false);
    expect(report.previewRows).toHaveLength(4);
    expect(report.previewRows[0].finalPublicLinkKey).toBe("result_or_resource_link");
    expect(report.previewRows[0].finalPublicLinkSha256).toHaveLength(64);
    expect(report.redactedPayloadManifest.payloads[0].cta.destination).toBe("final_public_link_ready_redacted:result_or_resource_link");
    expect(report.redactedPayloadManifest.payloads[3].contentBlocks[1]).toMatchObject({
      type: "reply_cta",
      destination: "reply",
      placeholder: null,
      correctionStatus: "reply_cta_text_only_no_raw_destination_token",
    });
    expect(markdown).toContain("Exact URLs stored in report: false");
    expect(serialized).not.toContain("https://example.com/result");
    expect(serialized).not.toContain("https://example.com/practice");
    expect(serialized).not.toContain("https://example.com/editorial");
  });

  test("allows preview-only URLs for correction QA while blocking audience-send readiness", () => {
    const previewOnlyState = buildCorrectionInputsState({
      path: "/tmp/private/correction-inputs.json",
      read: {
        present: true,
        value: {
          ...correctionPayload,
          visibilityTier: "unlisted_noindex_preview",
          subscriptionReasonPolicy: "remove_custom_line_and_rely_on_platform_footer",
        },
        error: null,
        chars: 240,
      },
    });
    const report = buildSeedInboxCorrectionPreview({
      payloadManifest,
      correctionPlan,
      correctionState: previewOnlyState,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("seed_inbox_correction_preview_ready_no_live_changes");
    expect(report.executiveSummary.finalPublicLinksReady).toBe(true);
    expect(report.executiveSummary.publicAudienceSendUrlGateReady).toBe(false);
    expect(report.executiveSummary.previewOnlyLinkCount).toBe(3);
    expect(report.executiveSummary.liveOrPromotedLinkCount).toBe(0);
    expect(report.previewRows[0].finalPublicLinkLifecycleStage).toBe("preview_url_ready");
    expect(report.redactedPayloadManifest?.correctionPreviewBoundary.blockersBeforeAudienceSend).toContain(
      "result_or_resource_link_not_live_or_promoted:preview_url_ready",
    );
    expect(serialized).not.toContain("https://example.com/result");
  });

  test("can render a platform-footer-only redacted preview variant", () => {
    const removePolicyState = buildCorrectionInputsState({
      path: "/tmp/private/correction-inputs.json",
      read: {
        present: true,
        value: {
          ...correctionPayload,
          subscriptionReasonPolicy: "remove_custom_line_and_rely_on_platform_footer",
        },
        error: null,
        chars: 200,
      },
    });
    const redacted = buildRedactedPayloadManifest({
      payloadManifest,
      correctionState: removePolicyState,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const payload = redactPayloadForPreview({
      payload: payloads[0],
      correctionState: removePolicyState,
    });

    expect(redacted.status).toBe("email_builder_payload_manifest_redacted_after_seed_inbox_correction_preview_no_live_changes");
    expect(payload.contentBlocks.find((block) => block.type === "compliance_footer")).toMatchObject({
      renderPolicy: "platform_footer_only",
      correctionStatus: "custom_subscription_reason_removed_in_preview",
    });
    expect(JSON.stringify(redacted)).not.toContain("https://example.com/result");
  });

  test("keeps safety closed", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      exactUrlsStoredInReport: false,
      uiOpened: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      outboundPerformed: false,
    });
  });
});
