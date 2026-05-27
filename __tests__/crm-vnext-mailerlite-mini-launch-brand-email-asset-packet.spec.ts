import { describe, expect, test } from "vitest";

import {
  asPublicText,
  buildBrandEmailAssetPacket,
  buildEmailAssetDrafts,
  buildVisualSpec,
  buildVoiceQa,
  launchFrom,
  parseArgs,
  renderMarkdown,
  scanDraftText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs";

const rehearsalPacket = {
  ok: true,
  status: "mini_launch_rehearsal_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  handoffs: {
    mailerLite: {
      candidates: {
        sourceGroupCandidate: {
          name: "CC · Source · Quiz · Inteligencia para descansar",
        },
        deliveredGroupCandidate: {
          name: "CC · Delivered · Quiz result · Inteligencia para descansar",
        },
      },
    },
  },
};

const seedTestQaPacket = {
  ok: true,
  status: "seed_test_qa_packet_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
};

const eventContract = {
  ok: true,
  status: "mini_launch_event_contract_ready_no_ledger_write",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/90_sources/voice/VOICE_FINGERPRINT_V0.md",
    present: true,
    chars: 1000,
    consultedFor: "voice, rhythm and anti-generic writing",
  },
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md",
    present: true,
    chars: 1000,
    consultedFor: "email layout, typography, CTA, signature and footer canon",
  },
];

describe("CRM vNext MailerLite mini-launch Brand/email asset packet", () => {
  test("normalizes default args and accepts report outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/packet.json",
      "--markdown-out",
      "/tmp/packet.md",
    ]);

    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.seedTestQaPacket).toContain("mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.voiceFingerprint).toContain("VOICE_FINGERPRINT_V0.md");
    expect(parsed.out).toBe("/tmp/packet.json");
    expect(parsed.markdownOut).toBe("/tmp/packet.md");
  });

  test("extracts launch and receipt candidates from upstream packets", () => {
    expect(launchFrom(rehearsalPacket, seedTestQaPacket, eventContract)).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
    });
  });

  test("builds public Email 1 draft without internal terms or the repeated formula", () => {
    const launch = launchFrom(rehearsalPacket, seedTestQaPacket, eventContract);
    const drafts = buildEmailAssetDrafts({ launch });
    const publicText = asPublicText(drafts.publicCopy);
    const scan = scanDraftText(publicText);

    expect(drafts.status).toBe("draft_for_brand_review_not_public_not_sent");
    expect(drafts.emailStep).toBe(1);
    expect(drafts.publicCopy.emailBody.cta.text).toBe("Ver mi lectura y práctica");
    expect(scan.bannedTermHits).toEqual([]);
    expect(scan.sometimesFormulaCount).toBe(0);
    expect(publicText).not.toMatch(/lead magnet|MailerLite|CRM|tag|launch_id/i);
  });

  test("keeps style spec aligned with email canon and marks signature/footer pending", () => {
    const visualSpec = buildVisualSpec();

    expect(visualSpec).toMatchObject({
      outerBackground: "#F4F7FA",
      containerBackground: "#FFFFFF",
      bodyFont: "Poppins, sans-serif",
      editorialAccentFont: "Georgia, serif",
    });
    expect(visualSpec.cta.rule).toContain("not default MailerLite blue");
    expect(visualSpec.signature.status).toBe("pending_asset_reference");
    expect(visualSpec.footer.status).toBe("needs_review_before_public_or_audience_send");
  });

  test("sets voice QA to review-ready but not approved", () => {
    const launch = launchFrom(rehearsalPacket, seedTestQaPacket, eventContract);
    const assetDrafts = buildEmailAssetDrafts({ launch });
    const qa = buildVoiceQa({ assetDrafts });

    expect(qa.verdict).toBe("yellow_ready_for_brand_review");
    expect(qa.publicTextScan.okForBrandReviewDraft).toBe(true);
    expect(qa.watchouts.join(" ")).toContain("Brand review");
  });

  test("builds and renders local-only packet with all live gates closed", () => {
    const packet = buildBrandEmailAssetPacket({
      rehearsalPacket,
      seedTestQaPacket,
      eventContract,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("brand_email_asset_packet_ready_for_brand_review_no_live_changes");
    expect(packet.readiness).toMatchObject({
      brandReviewStatus: "needs_brand_review",
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      browserUsed: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
    });
    expect(packet.approvalGates.find((gate) => gate.id === "audience_launch")).toMatchObject({
      currentStatus: "closed",
      approvalNeededFromAlejandro: true,
    });
    expect(markdown).toContain("Mini-Launch Brand/Email Asset Packet");
    expect(markdown).toContain("Borrador Publico - Email 1");
    expect(markdown).toContain("Sin test email enviado");
  });
});
