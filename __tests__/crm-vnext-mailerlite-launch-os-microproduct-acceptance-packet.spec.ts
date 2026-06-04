import { describe, expect, test } from "vitest";

import {
  buildMicroproductAcceptancePacket,
  parseArgs,
  renderMarkdown,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-launch-os-microproduct-acceptance-packet.mjs";

const ceoProposalPacket = {
  status: "ceo_proposal_packet_ready_for_ceo_review_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  executiveSummary: {
    ceoProposalReviewReady: true,
    ceoProposalReviewReadyWithSeedCaveat: false,
    productValueReady: true,
    integratedExperienceReady: true,
    webShopifyReady: true,
    mailerLiteDeliveryReady: true,
    compactSeedExecutionComplete: true,
    crmSignalDesignReady: true,
    publicSendApprovalReady: false,
    liveActionAllowedNow: false,
  },
  gateMatrix: [
    {
      id: "brand_web_integrated_qa",
      ready: true,
      status: "green",
      evidence: {
        status: "integrated_experience_qa_ready_for_ceo_review_no_live_changes",
        integratedExperienceReady: true,
        blockerCount: 0,
      },
    },
    {
      id: "product_value_gate",
      ready: true,
      status: "green",
      evidence: {
        blockerCount: 0,
      },
    },
    {
      id: "web_shopify_destination_readiness",
      ready: true,
      status: "preview_ready_public_send_closed",
      evidence: {
        finalPublicLinksReady: true,
        localAssetSlotReadyCount: 3,
        previewUrlReadyCount: 3,
        publicAudienceSendUrlGateReady: false,
      },
    },
    {
      id: "mailerlite_delivery_logic",
      ready: true,
      status: "drafts_and_seed_execution_complete",
      evidence: {
        compactFooterDraftsReady: true,
        compactFooterSeedPreflightGreen: true,
        compactFooterSeedExecutionState: "complete_e01_e02_e03_e04",
        sentLabels: ["E01", "E02", "E03", "E04"],
        unsentLabels: [],
      },
    },
    {
      id: "crm_signal_design",
      ready: true,
      status: "ready_no_live_writes",
    },
  ],
};

const ceoReviewReadinessDelta = {
  executiveSummary: {
    compactFooterSeedExecutionComplete: true,
    compactFooterSeedInboxArtifactQaReady: true,
    compactFooterVisualReadbackGreen: true,
  },
};

const pilotDistributionDecisionIntake = {
  executiveSummary: {
    selectedPilotLane: "keep_null_audience_no_public_send",
    wouldAuthorizeSend: false,
    wouldAuthorizeAudienceAssignment: false,
    liveActionAllowedNow: false,
  },
};

const learningDigest = {
  executiveSummary: {
    publicAudienceSendAuthorized: false,
    liveActionAllowedNow: false,
  },
};

const baselineAudit = {
  executiveSummary: {
    publicAudienceSendAuthorized: false,
    liveActionAllowedNow: false,
  },
};

const hardeningPlan = {
  executiveSummary: {
    recommendedImmediateTrack: "onboarding_v2_draft_content_mapping_hardening",
  },
};

const taxonomyAudit = {
  status: "taxonomy_receipts_consolidated_no_live_changes",
  executiveSummary: {
    liveEvidenceGroupCount: 19,
    brandPromotionNeededCount: 0,
    crmManifestRefreshNeededCount: 0,
    issueCount: 0,
    openLiveMutationGateCount: 0,
  },
};

const taxonomyHandoff = {
  status: "taxonomy_refresh_handoff_not_needed_no_live_changes",
  executiveSummary: {
    openLiveMutationGateCount: 0,
  },
};

const baseInput = {
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  pilotDistributionDecisionIntake,
  learningDigest,
  baselineAudit,
  hardeningPlan,
  taxonomyAudit,
  taxonomyHandoff,
  generatedAt: "2026-06-04T00:00:00.000Z",
};

describe("CRM vNext MailerLite Launch OS microproduct acceptance packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--ceo-proposal-packet",
      "/tmp/ceo.json",
      "--taxonomy-audit",
      "/tmp/taxonomy.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.ceoProposalPacket).toBe("/tmp/ceo.json");
    expect(parsed.taxonomyAudit).toBe("/tmp/taxonomy.json");
    expect(parsed.out).toBe("/tmp/out.json");
  });

  test("builds a local-only reusable acceptance packet with CRM signal writes deferred", () => {
    const packet = buildMicroproductAcceptancePacket(baseInput);

    expect(packet.status).toBe("microproduct_acceptance_packet_ready_local_only_with_crm_signal_deferred");
    expect(packet.executiveSummary).toMatchObject({
      reusableAcceptancePacketReady: true,
      readyForCeoReviewLocalOnly: true,
      readyForNextLocalGate: true,
      readyForPublicAudienceSendApproval: false,
      readyForCrmSignalWriteApproval: false,
      liveActionAllowedNow: false,
      taxonomyLocalConsolidated: "green",
      crmSignalWriteReadiness: "deferred_until_real_observed_events",
      publicAudienceSend: "closed",
      seedTests: "only_under_standing_delegation_and_green_qa",
      greenGateCount: 5,
      yellowGateCount: 1,
      redGateCount: 0,
      noCeoDecisionNeededYet: true,
    });
    expect(packet.gateMatrix.find((entry) => entry.id === "crm")).toMatchObject({
      trafficLight: "yellow",
      readyForLive: false,
      blockers: ["missing_real_private_observed_events_for_signal_write_readiness"],
    });
    expect(packet.hardStops).toContain("Do not reopen CRM signal-write readiness until real private observed events exist.");
    expect(packet.safety.observedEventsInvented).toBe(false);
    expect(packet.safety.seedOrQaTreatedAsMarketSignal).toBe(false);
    expect(safetyClosed(packet.safety)).toBe(true);
  });

  test("does not mark acceptance ready when taxonomy is not consolidated", () => {
    const packet = buildMicroproductAcceptancePacket({
      ...baseInput,
      taxonomyAudit: {
        status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
        executiveSummary: {
          liveEvidenceGroupCount: 19,
          brandPromotionNeededCount: 1,
          crmManifestRefreshNeededCount: 0,
          issueCount: 0,
          openLiveMutationGateCount: 0,
        },
      },
    });

    expect(packet.status).toBe("microproduct_acceptance_packet_blocked_local_only");
    expect(packet.executiveSummary.taxonomyLocalConsolidated).toBe("blocked");
    expect(packet.clearRequestsIfBlocked.find((item) => item.gateId === "brand")?.request)
      .toContain("Refresh Brand/taxonomy evidence locally");
  });

  test("renders a decision-oriented Markdown packet", () => {
    const markdown = renderMarkdown(buildMicroproductAcceptancePacket(baseInput));

    expect(markdown).toContain("Microproduct Acceptance Packet");
    expect(markdown).toContain("taxonomy local consolidated = green");
    expect(markdown).toContain("CRM signal-write readiness = deferred_until_real_observed_events");
    expect(markdown).toContain("Needs CEO decision now: false");
    expect(markdown).toContain("Seed or QA treated as market signal: false");
  });
});
