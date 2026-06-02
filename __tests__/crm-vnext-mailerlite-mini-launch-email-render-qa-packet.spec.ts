import { describe, expect, test } from "vitest";

import { buildHtmlForPayload } from "../scripts/crm-vnext-mailerlite-mini-launch-email-asset-build.mjs";
import {
  buildPacket,
  buildSafety,
  buildSourceReadiness,
  buildStaticChecksForEmail,
  parseArgs,
  renderMarkdown,
  scanPublicText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs";

const payloads = [
  {
    step: 1,
    role: "delivery_and_orientation",
    name: "ML Draft · descanso · E01 Delivery orientation",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
    subject: "Tu lectura de descanso",
    preheader: "Una entrada amable.",
    contentBlocks: [
      { type: "preheader", text: "Una entrada amable." },
      { type: "greeting", text: "Hola," },
      { type: "paragraph", text: "Gracias por hacer el quiz." },
      {
        type: "cta",
        text: "Ver mi lectura",
        destination: "result_or_resource_link_placeholder",
        placeholder: {
          key: "result_or_resource_link",
          value: "result_or_resource_link_placeholder",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
      { type: "closing", text: "Un abrazo, Alejandro" },
      { type: "signature", text: "Alejandro signature asset or text-signature fallback" },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 2,
    role: "practice_or_value",
    name: "ML Draft · descanso · E02 Practice",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
    subject: "Una practica breve",
    preheader: "Sin hacerlo perfecto.",
    contentBlocks: [
      { type: "paragraph", text: "Una practica pequena." },
      {
        type: "cta",
        text: "Guardar esta practica",
        destination: "practice_link_placeholder",
        placeholder: { value: "practice_link_placeholder" },
      },
      { type: "signature", text: "Alejandro signature asset or text-signature fallback" },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 3,
    role: "story_or_editorial_depth",
    name: "ML Draft · descanso · E03 Editorial depth",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E03 Editorial depth",
    subject: "El descanso tambien pide criterio",
    preheader: "Una nota breve.",
    contentBlocks: [
      { type: "paragraph", text: "Una nota para mirar con honestidad." },
      {
        type: "cta",
        text: "Leer la nota breve",
        destination: "editorial_note_link_placeholder",
        placeholder: { value: "editorial_note_link_placeholder" },
      },
      { type: "signature", text: "Alejandro signature asset or text-signature fallback" },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
  {
    step: 4,
    role: "invitation_or_feedback",
    name: "ML Draft · descanso · E04 Feedback invitation",
    mailerLiteAssetNameDraft: "ML Draft · descanso · E04 Feedback invitation",
    subject: "Que notaste",
    preheader: "Una pregunta pequena.",
    contentBlocks: [
      { type: "paragraph", text: "Puedes responder con una linea." },
      { type: "reply_cta", text: "Responder con una linea", destination: "reply", placeholder: null },
      { type: "signature", text: "Alejandro signature asset or text-signature fallback" },
      { type: "compliance_footer", text: "MailerLite unsubscribe footer." },
    ],
  },
];

const payloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  approvalBoundary: {
    manifestIsApprovalByItself: false,
    exactAssetBuildApprovalStillRequired: true,
    canExecuteBuilderNow: false,
    canSendNow: false,
    canAttachWorkflowNow: false,
    canReadOrAssignSubscribersNow: false,
    canCreateGroupsNow: false,
  },
  payloads,
};

const assetBuildDryRun = {
  status: "dry_run_ready_for_exact_asset_build_approval",
  freshScan: {
    campaignsRead: 25,
    createDraftCount: 4,
    updateDraftCount: 0,
    conflictCount: 0,
  },
  assetMutations: [],
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
  },
};

const generatedEmails = payloads.map((target) => {
  const html = buildHtmlForPayload(target);
  return {
    step: target.step,
    role: target.role,
    name: target.name,
    subject: target.subject,
    htmlPath: `/tmp/render/email_${target.step}.html`,
    html,
    staticQa: buildStaticChecksForEmail({ target, html }),
  };
});

const signatureAssetReference = {
  selected: {
    src: "https://storage.mlcdn.com/account/signature.png",
    srcSha256: "f4af67564b7ca921fafc612eb7eaeaecab3f1e1148e85a7cb111fb7195adfab8",
    host: "storage.mlcdn.com",
    width: 189,
    height: null,
  },
};

const renderPreviewFor = (htmlPath: string) => ({
  htmlPath,
  renderPreview: {
    attempted: true,
    status: "rendered",
    path: `${htmlPath}.png`,
    dimensions: {
      width: 1200,
      height: 900,
      ok: true,
    },
    fileSizeBytes: 76000,
    fileSizeOk: true,
    minFileSizeBytes: 5000,
  },
});

describe("CRM vNext MailerLite mini-launch email render QA packet", () => {
  test("normalizes args and defaults", () => {
    const parsed = parseArgs([
      "--render-dir",
      "/tmp/render",
      "--skip-render",
      "--signature-asset-reference",
      "/tmp/private-signature.json",
      "--out",
      "/tmp/render-qa.json",
      "--markdown-out",
      "/tmp/render-qa.md",
    ]);

    expect(parsed.payloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.assetBuildDryRun).toContain("mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json");
    expect(parsed.renderDir).toBe("/tmp/render");
    expect(parsed.skipRender).toBe(true);
    expect(parsed.signatureAssetReference).toBe("/tmp/private-signature.json");
    expect(parsed.out).toBe("/tmp/render-qa.json");
  });

  test("keeps generated public copy free of internal platform terms", () => {
    const scan = scanPublicText(generatedEmails[0].html);

    expect(scan.ok).toBe(true);
    expect(scan.bannedTermHits).toEqual([]);
    expect(generatedEmails[0].html).toContain("result_or_resource_link_placeholder");
    expect(generatedEmails[0].html).toContain('href="result_or_resource_link_placeholder"');
    expect(generatedEmails[0].html).toContain("Alejandro Gómez Bernal");
    expect(generatedEmails[0].html).toContain("Psicólogo · Monje · Desarrollador de proyectos con sentido.");
    expect(generatedEmails[0].html).toContain('href="{$unsubscribe}"');
    expect(generatedEmails[0].html).toContain("Darme de baja");
    expect(generatedEmails[0].html).toContain("Finca el Amanecer, vereda Alatania, Subachoque");
    expect(generatedEmails[0].html).toContain("Colombia");
    expect(generatedEmails[0].html).not.toContain('<span class="placeholder-note">result_or_resource_link_placeholder</span>');
    expect(generatedEmails[0].html).not.toContain("MailerLite unsubscribe footer");
  });

  test("builds static checks for URL and reply CTA boundaries", () => {
    expect(generatedEmails[0].staticQa.staticGreenEnoughForLocalRender).toBe(true);
    expect(generatedEmails[0].staticQa.expectedUrlPlaceholders).toEqual(["result_or_resource_link_placeholder"]);
    expect(generatedEmails[0].staticQa.missingPlaceholders).toEqual([]);
    expect(generatedEmails[0].staticQa.visibleLinkTokenHitCount).toBe(0);
    expect(generatedEmails[0].staticQa.plainTextFallbackScan.clean).toBe(true);
    expect(generatedEmails[0].staticQa.checks.find((check) => check.id === "canonical_author_footer")?.status).toBe("green");
    expect(generatedEmails[3].staticQa.hasReplyCta).toBe(true);
    expect(generatedEmails[3].staticQa.expectedUrlPlaceholders).toEqual([]);
    expect(generatedEmails[3].staticQa.rawReplyDestinationRendered).toBe(false);
    expect(generatedEmails[3].html).not.toContain('<span class="placeholder-note">reply</span>');
    expect(generatedEmails[3].staticQa.redCount).toBe(0);
  });

  test("blocks plain-text fallbacks that still expose link tokens", () => {
    const target = {
      ...payloads[0],
      plainTextFallback: "Ver mi lectura: {{ result_or_resource_link }}",
    };
    const html = buildHtmlForPayload(target);
    const qa = buildStaticChecksForEmail({ target, html });

    expect(qa.staticGreenEnoughForLocalRender).toBe(false);
    expect(qa.plainTextFallbackScan.clean).toBe(false);
    expect(qa.plainTextFallbackScan.linkTokenHitCount).toBe(1);
    expect(qa.checks.find((check) => check.id === "plain_text_fallback_no_visible_link_token")?.status).toBe("red");
  });

  test("validates source readiness only when the no-live dry-run is green", () => {
    const readiness = buildSourceReadiness({ payloadManifest, assetBuildDryRun });

    expect(readiness.ok).toBe(true);
    expect(readiness.issues).toEqual([]);

    const redactedCorrectionPreviewReadiness = buildSourceReadiness({
      payloadManifest: {
        ...payloadManifest,
        status: "email_builder_payload_manifest_redacted_after_seed_inbox_correction_preview_no_live_changes",
        mode: "local_only_redacted_seed_inbox_correction_payload_manifest",
      },
      assetBuildDryRun,
    });

    expect(redactedCorrectionPreviewReadiness.ok).toBe(true);
    expect(redactedCorrectionPreviewReadiness.issues).toEqual([]);

    const blocked = buildSourceReadiness({
      payloadManifest,
      assetBuildDryRun: {
        ...assetBuildDryRun,
        safety: {
          ...assetBuildDryRun.safety,
          sendsPerformed: true,
        },
      },
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.issues).toContain("asset_build_dry_run_reports_send");
  });

  test("reports green local render QA without opening live gates", () => {
    const packet = buildPacket({
      payloadManifest,
      assetBuildDryRun,
      generatedEmails,
      renderPreviews: generatedEmails.map((email) => renderPreviewFor(email.htmlPath)),
      sourceDigests: [
        {
          path: "/tmp/payload-manifest.json",
          present: true,
          chars: 1000,
          consultedFor: "mini-launch email builder payload manifest and approval boundary",
        },
        {
          path: "/tmp/asset-build-dry-run.json",
          present: true,
          chars: 1000,
          consultedFor: "mini-launch email asset-build dry-run and fresh campaign scan",
        },
      ],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_render_qa_green_no_live_changes");
    expect(packet.executiveSummary.localRenderReady).toBe(true);
    expect(packet.executiveSummary.renderPreviewNonEmptyCount).toBe(4);
    expect(packet.executiveSummary.visibleLinkTokenHitCount).toBe(0);
    expect(packet.executiveSummary.plainTextFallbackCleanCount).toBe(4);
    expect(packet.executiveSummary.plainTextFallbackLinkTokenHitCount).toBe(0);
    expect(packet.emailQa[0].staticQa.checks.find((check) => check.id === "canonical_author_footer")?.status).toBe("green");
    expect(packet.executiveSummary.visualSignatureAssetReadyCount).toBe(0);
    expect(packet.executiveSummary.signatureFallbackCount).toBe(4);
    expect(packet.executiveSummary.publicUseReady).toBe(false);
    expect(packet.executiveSummary.mailerLiteBuilderReady).toBe(false);
    expect(packet.safety).toMatchObject({
      localOnly: true,
      quickLookUsed: true,
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("marks visual signature ready without printing the exact signature URL in packet evidence", () => {
    const generatedWithSignature = payloads.map((target) => {
      const html = buildHtmlForPayload(target, { signatureAssetReference });
      return {
        step: target.step,
        role: target.role,
        name: target.name,
        subject: target.subject,
        htmlPath: `/tmp/render/email_${target.step}.html`,
        html,
        staticQa: buildStaticChecksForEmail({ target, html }),
      };
    });
    const packet = buildPacket({
      payloadManifest,
      assetBuildDryRun,
      signatureAssetReference,
      generatedEmails: generatedWithSignature,
      renderPreviews: generatedWithSignature.map((email) => renderPreviewFor(email.htmlPath)),
      generatedAt: "2026-06-02T00:00:00.000Z",
    });
    const packetJson = JSON.stringify(packet);

    expect(packet.executiveSummary.visualSignatureAssetReadyCount).toBe(4);
    expect(packet.executiveSummary.signatureFallbackCount).toBe(0);
    expect(packet.inputs.signatureAssetReference).toMatchObject({
      ready: true,
      selectedSrcSha256: "f4af67564b7ca921fafc612eb7eaeaecab3f1e1148e85a7cb111fb7195adfab8",
      exactSrcPrinted: false,
    });
    expect(packet.emailQa[0].staticQa.checks.find((check) => check.id === "signature_identity")?.status).toBe("green");
    expect(packetJson).not.toContain("https://storage.mlcdn.com/account/signature.png");
  });

  test("does not mark tiny or missing previews as local-render ready", () => {
    const packet = buildPacket({
      payloadManifest,
      assetBuildDryRun,
      generatedEmails,
      renderPreviews: generatedEmails.map((email, index) => renderPreviewFor(email.htmlPath)).map((preview, index) => index === 0
        ? {
            ...preview,
            renderPreview: {
              ...preview.renderPreview,
              fileSizeBytes: 800,
              fileSizeOk: false,
            },
          }
        : preview),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_render_qa_static_green_render_missing_no_live_changes");
    expect(packet.executiveSummary.localRenderReady).toBe(false);
    expect(packet.executiveSummary.renderPreviewNonEmptyCount).toBe(3);
  });

  test("renders Markdown with every email and the closed boundary", () => {
    const packet = buildPacket({
      payloadManifest,
      assetBuildDryRun,
      generatedEmails,
      renderPreviews: generatedEmails.map((email) => renderPreviewFor(email.htmlPath)),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-launch Email Render QA Packet");
    expect(markdown).toContain("Local render ready: true");
    expect(markdown).toContain("E01 - delivery_and_orientation");
    expect(markdown).toContain("No MailerLite builder edit");
    expect(markdown).toContain("Sin subscribers, grupos, workflows");
  });

  test("keeps safety closed", () => {
    expect(buildSafety({ quickLookUsed: true, htmlWrittenCount: 4 })).toMatchObject({
      quickLookUsed: true,
      htmlWrittenCount: 4,
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyMutationsPerformed: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      outboundPerformed: false,
    });
  });
});
