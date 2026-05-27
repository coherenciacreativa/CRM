import { describe, expect, test } from "vitest";

import {
  buildEmailSequenceAssetPacket,
  buildEmailSequenceAssets,
  buildSequenceQa,
  launchFrom,
  parseArgs,
  renderMarkdown,
  sequencePublicText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-sequence-asset-packet.mjs";

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

const brandEmailAssetPacket = {
  ok: true,
  status: "brand_email_asset_packet_ready_for_brand_review_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
  assetDrafts: {
    publicCopy: {
      subjectOptions: [
        { text: "Tu lectura: qué tipo de descanso está pidiendo tu mente" },
        { text: "Una pista amable para descansar mejor" },
      ],
      preheaderOptions: [
        { text: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea." },
      ],
      emailBody: {
        greeting: "Hola,",
        paragraphs: [
          "Gracias por hacer Inteligencia para descansar.",
          "Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte.",
        ],
        cta: {
          text: "Ver mi lectura y práctica",
          destination: "result_or_resource_link_placeholder",
        },
        closing: "Un abrazo,\nAlejandro",
      },
      plainTextFallback: "Hola,\n\nGracias por hacer Inteligencia para descansar.\n\nUn abrazo,\nAlejandro",
    },
  },
};

const brandCandidateReviewPacket = {
  ok: true,
  status: "brand_candidate_review_packet_ready_no_live_changes",
  dictionaryState: {
    missingCandidateCount: 2,
  },
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "launch identity, audience hypothesis and rough sequence strategy",
  },
];

describe("CRM vNext MailerLite mini-launch email sequence asset packet", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/sequence.json",
      "--markdown-out",
      "/tmp/sequence.md",
    ]);

    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandEmailAssetPacket).toContain("mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandCandidateReviewPacket).toContain("mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/sequence.json");
    expect(parsed.markdownOut).toBe("/tmp/sequence.md");
  });

  test("extracts launch and builds four email assets", () => {
    const launch = launchFrom(rehearsalPacket, eventContract, brandEmailAssetPacket);
    const sequence = buildEmailSequenceAssets({ launch, brandEmailAssetPacket });

    expect(launch).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
    });
    expect(sequence).toHaveLength(4);
    expect(sequence.map((email) => email.role)).toEqual([
      "delivery_and_orientation",
      "practice_or_value",
      "story_or_editorial_depth",
      "invitation_or_feedback",
    ]);
    expect(sequence[0].status).toBe("draft_from_prior_brand_email_asset_packet_not_public_not_sent");
  });

  test("keeps public copy clean from internal terms and repeated formula", () => {
    const launch = launchFrom(rehearsalPacket, eventContract, brandEmailAssetPacket);
    const sequence = buildEmailSequenceAssets({ launch, brandEmailAssetPacket });
    const qa = buildSequenceQa(sequence);
    const publicText = sequencePublicText(sequence);

    expect(qa.verdict).toBe("yellow_ready_for_brand_review_not_approved");
    expect(qa.aggregateScan.bannedTermHits).toEqual([]);
    expect(qa.aggregateScan.sometimesFormulaCount).toBe(0);
    expect(publicText).not.toMatch(/lead magnet|MailerLite|CRM|tag|launch_id|workflow/i);
    expect(publicText).not.toMatch(/\ba veces\b/i);
  });

  test("builds packet with all live gates closed", () => {
    const packet = buildEmailSequenceAssetPacket({
      rehearsalPacket,
      eventContract,
      brandEmailAssetPacket,
      brandCandidateReviewPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("email_sequence_asset_packet_ready_for_brand_review_no_live_changes");
    expect(packet.readiness).toMatchObject({
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
    });
    expect(packet.mailerLiteAssetPlan.workflowPosture).toMatchObject({
      activeWorkflowAllowedNow: false,
      touchesOnboardingV1: false,
      touchesOnboardingV2: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      crmCardMutationsPerformed: false,
    });
  });

  test("keeps Sent groups off by default and onboarding handoff closed", () => {
    const packet = buildEmailSequenceAssetPacket({
      rehearsalPacket,
      eventContract,
      brandEmailAssetPacket,
      brandCandidateReviewPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.receiptAndOnboardingPolicy.sequenceSentGroupDefault).toBe("none");
    expect(packet.receiptAndOnboardingPolicy.sentGroupRule).toContain("unless Brand canonizes");
    expect(packet.receiptAndOnboardingPolicy.onboardingHandoff).toMatchObject({
      currentStatus: "closed_until_separate_onboarding_gate",
      preservesProductionOnboardingV1: true,
    });
  });

  test("renders sequence report without authorizing MailerLite work", () => {
    const packet = buildEmailSequenceAssetPacket({
      rehearsalPacket,
      eventContract,
      brandEmailAssetPacket,
      brandCandidateReviewPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Email Sequence Asset Packet");
    expect(markdown).toContain("Email 4: invitation_or_feedback");
    expect(markdown).toContain("Ready for seed send now: false");
    expect(markdown).toContain("No crea assets en MailerLite");
    expect(markdown).toContain("Sin test email enviado");
  });
});
