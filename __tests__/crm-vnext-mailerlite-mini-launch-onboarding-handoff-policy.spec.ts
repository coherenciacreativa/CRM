import { describe, expect, test } from "vitest";

import {
  buildApprovalBoundary,
  buildHandoffLadder,
  buildPolicy,
  buildRecommendationInputs,
  buildSafety,
  eventKindsFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-onboarding-handoff-policy.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
  sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
  deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
};

const miniLaunchEventContract = {
  launch,
  eventContract: [
    "email_submitted",
    "source_assigned",
    "quiz_or_game_completed",
    "resource_delivered",
    "email_click",
    "email_reply",
    "market_signal_reviewed",
  ].map((eventKind) => ({ eventKind })),
};

const onboardingEventContract = {
  eventContract: [
    "onboarding_handoff_recommended",
    "onboarding_eligibility_assigned",
    "onboarding_started",
    "onboarding_completed",
    "audience_eligibility_assigned",
  ].map((eventKind) => ({
    eventKind,
    projectionPosture: eventKind === "onboarding_handoff_recommended"
      ? "store_only"
      : "store_only_no_route",
    approvalGate: "sample approval gate",
  })),
};

const onboardingV1Audit = {
  workflow: {
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
  },
};

const onboardingV2Design = {
  workflowBlueprint: {
    trigger: {
      group: {
        name: "CC · Journey · Editorial onboarding · Eligible",
      },
    },
  },
};

describe("CRM vNext MailerLite mini-launch onboarding handoff policy", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/handoff.json",
      "--markdown-out",
      "/tmp/handoff.md",
    ]);

    expect(parsed.miniLaunchEventContract).toContain("mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json");
    expect(parsed.onboardingEventContract).toContain("mailerlite_onboarding_v2_event_contract_2026-05-27.json");
    expect(parsed.brandTaxonomy).toContain("MAILERLITE_RECEIPT_TAXONOMY_V0.md");
    expect(parsed.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(parsed.out).toBe("/tmp/handoff.json");
  });

  test("extracts event kinds", () => {
    expect(eventKindsFrom(miniLaunchEventContract)).toContain("resource_delivered");
    expect(eventKindsFrom(onboardingEventContract)).toContain("onboarding_handoff_recommended");
  });

  test("builds policy that treats recommendation as not routing", () => {
    const policy = buildPolicy({
      miniLaunchEventContract,
      onboardingEventContract,
      emailSequence: { launch },
      readinessBoard: { launch },
      onboardingV1Audit,
      onboardingV2Design,
      sourceDigests: [],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(policy.status).toBe("mini_launch_onboarding_handoff_policy_ready_no_live_changes");
    expect(policy.v1Protection.productionV1Protected).toBe(true);
    expect(policy.targetGroups.eligible).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(policy.contractCoverage.missingEvents).toEqual([]);
    expect(policy.operatorRule).toContain("Recommendation is not routing");
    expect(policy.handoffLadder.map((step) => step.action)).toEqual([
      "store_or_preview_market_signal",
      "recommend_onboarding_handoff",
      "assign_onboarding_eligibility_group",
      "start_onboarding_v2",
      "complete_onboarding_and_enter_newsletter_audience",
    ]);
    expect(policy.handoffLadder.find((step) => step.action === "recommend_onboarding_handoff")?.currentAllowedState).toBe("store_only_event_contract");
    expect(policy.approvalBoundary.closedNow).toContain("Assign any subscriber to onboarding eligibility.");
    expect(policy.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      subscriberMutationsPerformed: false,
      signalLedgerAppendPerformed: false,
    });
  });

  test("marks missing event coverage as blocked", () => {
    const policy = buildPolicy({
      miniLaunchEventContract: {
        launch,
        eventContract: [{ eventKind: "email_submitted" }],
      },
      onboardingEventContract: {
        eventContract: [{ eventKind: "onboarding_handoff_recommended" }],
      },
      emailSequence: { launch },
      readinessBoard: { launch },
      onboardingV1Audit,
      onboardingV2Design,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(policy.status).toBe("blocked_missing_handoff_event_contracts_no_live_changes");
    expect(policy.contractCoverage.missingEvents).toContain("resource_delivered");
    expect(policy.contractCoverage.missingEvents).toContain("onboarding_eligibility_assigned");
  });

  test("builds recommendation inputs and approval boundary", () => {
    const targetGroups = {
      eligible: "CC · Journey · Editorial onboarding · Eligible",
    };
    const inputs = buildRecommendationInputs({ launch, targetGroups });
    const boundary = buildApprovalBoundary();

    expect(inputs.map((input) => input.id)).toContain("engagement_or_explicit_interest");
    expect(inputs.find((input) => input.id === "launch_delivery_completed")?.acceptableEvidence).toContain(launch.deliveredGroupCandidate);
    expect(boundary.closedNow.join(" ")).toContain("Signal Ledger");
  });

  test("renders markdown with closed gates", () => {
    const policy = buildPolicy({
      miniLaunchEventContract,
      onboardingEventContract,
      emailSequence: { launch },
      readinessBoard: { launch },
      onboardingV1Audit,
      onboardingV2Design,
      sourceDigests: [
        {
          path: "/tmp/source.json",
          consultedFor: "test source",
        },
      ],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(policy);

    expect(markdown).toContain("Mini-launch to Onboarding Handoff Policy");
    expect(markdown).toContain("recommend_onboarding_handoff");
    expect(markdown).toContain("Closed now");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
    expect(buildHandoffLadder({ launch, targetGroups: policy.targetGroups })).toHaveLength(5);
    expect(buildSafety().groupsCreated).toBe(false);
  });
});
