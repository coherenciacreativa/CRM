import { describe, expect, test } from "vitest";

import {
  buildPacket,
  buildSafety,
  buildStaticChecks,
  parseArgs,
  renderMarkdown,
  scanPublicText,
} from "../scripts/crm-vnext-mailerlite-brujula-email-render-qa-packet.mjs";

const correctionPacket = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  outputs: {
    htmlPath: "/tmp/mailerlite_brujula_email1_corrected_draft_2026-05-27.html",
  },
};

const html = `<!doctype html>
<html lang="es">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background: #F4F7FA; color: #474747; font-family: Poppins, Arial, sans-serif; }
    .container { max-width: 640px; background: #FFFFFF; }
    .content { padding: 48px 50px 40px; }
    .eyebrow { font-family: Georgia, serif; color: #2F3E63; }
    .button { display: inline-block; background: #2F3E63; color: #FFFFFF !important; border-radius: 7px; }
    .signature { font-family: Georgia, serif; }
    @media (max-width: 640px) { .content { padding: 36px 24px 32px; } }
  </style>
</head>
<body>
  <div class="container">
    <p>Gracias por pedir La Brújula de Claridad.</p>
    <a class="button" href="https://coherenciacreativa.com/pages/guia-brujula-de-claridad">Abrir la guía</a>
    <p>La claridad suele entrar mejor cuando uno deja de apurarse.</p>
    <div class="signature">Alejandro</div>
  </div>
</body>
</html>`;

const renderPreview = {
  attempted: true,
  status: "rendered",
  path: "/tmp/render/mailerlite_brujula_email1_corrected_draft_2026-05-27.html.png",
  dimensions: {
    width: 1200,
    height: 900,
    ok: true,
  },
  fileSizeBytes: 56000,
  fileSizeOk: true,
  minFileSizeBytes: 5000,
};

describe("CRM vNext MailerLite Brújula Email 1 render QA packet", () => {
  test("normalizes args", () => {
    const parsed = parseArgs([
      "--html",
      "/tmp/email.html",
      "--render-dir",
      "/tmp/render",
      "--skip-render",
      "--out",
      "/tmp/render-qa.json",
      "--markdown-out",
      "/tmp/render-qa.md",
    ]);

    expect(parsed.correctionPacket).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.html).toBe("/tmp/email.html");
    expect(parsed.renderDir).toBe("/tmp/render");
    expect(parsed.skipRender).toBe(true);
    expect(parsed.out).toBe("/tmp/render-qa.json");
  });

  test("scans public copy without internal language or repeated formula", () => {
    const scan = scanPublicText(html);

    expect(scan.ok).toBe(true);
    expect(scan.bannedTermHits).toEqual([]);
    expect(scan.sometimesFormulaCount).toBe(0);
  });

  test("builds static checks for brand email style", () => {
    const checks = buildStaticChecks(html);

    expect(checks.staticGreenEnoughForLocalRender).toBe(true);
    expect(checks.redCount).toBe(0);
    expect(checks.checks.find((check) => check.id === "signature_identity")?.status).toBe("yellow_text_signature_only");
  });

  test("reports green local render QA without opening live gates", () => {
    const packet = buildPacket({
      correctionPacket,
      correctionPacketPath: "/tmp/correction.json",
      html,
      htmlPath: "/tmp/email.html",
      renderPreview,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email1_local_render_qa_green_no_live_changes");
    expect(packet.executiveSummary.renderPreviewNonEmpty).toBe(true);
    expect(packet.executiveSummary.localRenderReady).toBe(true);
    expect(packet.executiveSummary.publicUseReady).toBe(false);
    expect(packet.inputs.correctionPacketPath).toBe("/tmp/correction.json");
    expect(packet.safety).toMatchObject({
      localOnly: true,
      quickLookUsed: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("does not mark a tiny preview as local-render ready", () => {
    const packet = buildPacket({
      correctionPacket,
      html,
      htmlPath: "/tmp/email.html",
      renderPreview: {
        ...renderPreview,
        fileSizeBytes: 800,
        fileSizeOk: false,
      },
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email1_static_qa_green_render_missing_no_live_changes");
    expect(packet.executiveSummary.renderPreviewNonEmpty).toBe(false);
    expect(packet.executiveSummary.localRenderReady).toBe(false);
  });

  test("renders Markdown with preview path and public-use boundary", () => {
    const packet = buildPacket({
      correctionPacket,
      html,
      htmlPath: "/tmp/email.html",
      renderPreview,
      sourceDigests: [
        {
          path: "/tmp/email.html",
          present: true,
          chars: html.length,
          consultedFor: "corrected html",
        },
      ],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Brújula Email 1 Render QA Packet");
    expect(markdown).toContain("Local render ready: true");
    expect(markdown).toContain(renderPreview.path);
    expect(markdown).toContain("File size ok: true");
    expect(markdown).toContain("No MailerLite builder edit");
  });

  test("keeps safety closed", () => {
    expect(buildSafety({ quickLookUsed: true })).toMatchObject({
      quickLookUsed: true,
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      outboundPerformed: false,
    });
  });
});
