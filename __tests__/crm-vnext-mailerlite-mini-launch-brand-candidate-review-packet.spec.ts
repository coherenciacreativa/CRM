import { describe, expect, test } from "vitest";

import {
  buildBrandDecisionOptions,
  buildReviewPacket,
  extractCandidateRows,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-brand-candidate-review-packet.mjs";

const candidateRows = [
  {
    name: "CC · Source · Quiz · Inteligencia para descansar",
    layer: "Source",
    recommendedStatus: "candidate",
    meaning: "Posible origen de personas que entran por el test/quiz Inteligencia para descansar.",
    usage: "Cohorte de mini-lanzamiento; crear en MailerLite solo si hace falta para routing, dedupe o recibo seed.",
    crmMapping: "source_type=quiz; source=inteligencia_para_descansar",
  },
  {
    name: "CC · Delivered · Quiz result · Inteligencia para descansar",
    layer: "Delivered",
    recommendedStatus: "candidate",
    meaning: "Posible marcador de entrega del resultado o práctica de Inteligencia para descansar.",
    usage: "Recibo de promesa cumplida; no significa apertura, lectura, click ni interés.",
    crmMapping: "content.delivered=quiz_result_inteligencia_para_descansar",
  },
];

const groupDryRun = {
  ok: true,
  status: "blocked_until_brand_dictionary_candidates",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  summary: {
    liveGroupsRead: 75,
    missingBrandCandidateCount: 2,
    safeEmptyCreateTargetCount: 0,
  },
  proposedBrandDictionaryRows: candidateRows,
};

const brandEmailAssetPacket = {
  ok: true,
  status: "brand_email_asset_packet_ready_for_brand_review_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  readiness: {
    brandReviewStatus: "needs_brand_review",
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    readyForReceiptSeedTestNow: false,
    readyForAudienceLaunchNow: false,
  },
  voiceQa: {
    verdict: "yellow_ready_for_brand_review",
    publicTextScan: {
      bannedTermHits: [],
      sometimesFormulaCount: 0,
      okForBrandReviewDraft: true,
    },
  },
};

const emptyBrandDictionary = {
  dictionaryPath: "/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md",
  names: [],
  groupsByNormalized: new Map(),
};

const registeredBrandDictionary = {
  dictionaryPath: emptyBrandDictionary.dictionaryPath,
  names: candidateRows.map((row) => row.name),
  groupsByNormalized: new Map([
    [
      "cc · source · quiz · inteligencia para descansar",
      {
        name: "CC · Source · Quiz · Inteligencia para descansar",
        layer: "Source",
        status: "candidate",
        purpose: "Posible origen.",
      },
    ],
    [
      "cc · delivered · quiz result · inteligencia para descansar",
      {
        name: "CC · Delivered · Quiz result · Inteligencia para descansar",
        layer: "Delivered",
        status: "candidate",
        purpose: "Posible entrega.",
      },
    ],
  ]),
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "source of missing candidate rows and live-read safety gates",
  },
];

const buildFixturePacket = (brandDictionary = emptyBrandDictionary) => buildReviewPacket({
  groupDryRun,
  brandEmailAssetPacket,
  brandDictionary,
  brandDictionaryRaw: "# Dictionary\n",
  sourceDigests,
  generatedAt: "2026-05-27T00:00:00.000Z",
});

describe("CRM vNext MailerLite mini-launch Brand candidate review packet", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/packet.json",
      "--markdown-out",
      "/tmp/packet.md",
    ]);

    expect(parsed.groupDryRun).toContain("mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandEmailAssetPacket).toContain("mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(parsed.out).toBe("/tmp/packet.json");
    expect(parsed.markdownOut).toBe("/tmp/packet.md");
  });

  test("extracts candidate rows from dry-run output", () => {
    expect(extractCandidateRows(groupDryRun)).toEqual(candidateRows);
    expect(extractCandidateRows({
      plannedGroups: candidateRows.map((row) => ({ proposedBrandDictionaryRow: row })),
    })).toEqual(candidateRows);
  });

  test("builds a local-only packet asking Brand for a semantic decision", () => {
    const packet = buildFixturePacket();

    expect(packet.status).toBe("brand_candidate_review_packet_ready_no_live_changes");
    expect(packet.brandDecisionRequest.recommendedDecision).toBe("add_as_candidate");
    expect(packet.dictionaryState.missingCandidateCount).toBe(2);
    expect(packet.gatesAfterCandidateOnly.ifBrandAddsRowsAsCandidate).toMatchObject({
      canCreateGroups: false,
      canAssignSubscribers: false,
      canSendEmail: false,
    });
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
    });
  });

  test("candidate-only decision does not contain live approval semantics", () => {
    const options = buildBrandDecisionOptions();

    expect(options.find((option) => option.id === "add_as_candidate")).toMatchObject({
      recommended: true,
      allowsLiveMailerLiteChanges: false,
    });
    expect(options.every((option) => option.allowsLiveMailerLiteChanges === false)).toBe(true);
  });

  test("registered candidates change recommended decision without opening live gates", () => {
    const packet = buildFixturePacket(registeredBrandDictionary);

    expect(packet.dictionaryState.missingCandidateCount).toBe(0);
    expect(packet.dictionaryState.allCandidatesAlreadyRegistered).toBe(true);
    expect(packet.brandDecisionRequest.recommendedDecision).toBe("no_action_or_promote_later");
    expect(packet.gatesAfterCandidateOnly.noApprovalPhraseAvailableFromThisPacket).toBe(true);
  });

  test("rendered markdown contains the handoff and keeps action gates closed", () => {
    const packet = buildFixturePacket();
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Brand Candidate Review Packet");
    expect(markdown).toContain("Decision Pedida A Brand");
    expect(markdown).toContain("CC · Source · Quiz · Inteligencia para descansar");
    expect(markdown).toContain("Candidate-only decision cannot create groups");
    expect(markdown).toContain("No autorices creacion de grupos");
    expect(markdown).not.toContain("Apruebo crear");
  });
});
