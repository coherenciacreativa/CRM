import { describe, expect, test } from "vitest";

import {
  buildDeliveryBlock,
  buildDeliveryPack,
  buildFollowUpPolicy,
  buildSafety,
  buildValidationCommands,
  parseArgs,
  renderMarkdown,
  responsePathFor,
  templatePathFor,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-delivery-pack.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const packetJson = (department: "brand" | "web_design" | "crm") => ({
  department,
  status: "awaiting_response",
  dispatchBlock: `Review ${department} without live changes.`,
  responseTemplate: {
    reviewMode: "no_live_review",
    liveApprovalGranted: false,
  },
  closedActions: [
    "No MailerLite groups",
    "No Shopify edits",
    "No CRM writes",
  ],
});

const packetsIndex = {
  launch,
  pendingDepartments: ["brand", "web_design", "crm"],
  packets: [
    {
      department: "brand",
      markdown: "/tmp/brand_review_packet.md",
      json: "/tmp/brand_review_packet.json",
    },
    {
      department: "web_design",
      markdown: "/tmp/web_design_review_packet.md",
      json: "/tmp/web_design_review_packet.json",
    },
    {
      department: "crm",
      markdown: "/tmp/crm_review_packet.md",
      json: "/tmp/crm_review_packet.json",
    },
  ],
};

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  currentState: {
    liveGates: {
      openLiveGateCount: 0,
    },
    miniLaunch: {
      currentPilot: launch,
    },
  },
};

const handoffPolicy = {
  status: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
  operatorRule: "Recommendation is not routing. Routing requires a later exact approval and a fresh protected workflow/subscriber scan.",
};

const sourceDigests = [
  {
    path: "/tmp/index.json",
    present: true,
    chars: 1000,
    consultedFor: "department packet paths and pending departments",
  },
];

const packetFiles = {
  "/tmp/brand_review_packet.json": packetJson("brand"),
  "/tmp/web_design_review_packet.json": packetJson("web_design"),
  "/tmp/crm_review_packet.json": packetJson("crm"),
};

describe("CRM vNext MailerLite department review delivery pack", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/delivery.json",
      "--markdown-out",
      "/tmp/delivery.md",
    ]);

    expect(parsed.packetsIndex).toContain("mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json");
    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responsesDir).toContain("mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27");
    expect(parsed.out).toBe("/tmp/delivery.json");
  });

  test("derives template and expected response paths", () => {
    expect(templatePathFor("/tmp/templates", "brand")).toBe("/tmp/templates/brand_response_template.json");
    expect(templatePathFor("/tmp/templates", "web_design")).toBe("/tmp/templates/web_design_response_template.json");
    expect(responsePathFor("/tmp/responses", "crm")).toBe("/tmp/responses/crm_response.json");
  });

  test("builds a safe department message block", () => {
    const block = buildDeliveryBlock({
      packet: {
        department: "brand",
        markdown: "/tmp/brand.md",
        json: "/tmp/brand.json",
        packetJson: packetJson("brand"),
      },
      templatePath: "/tmp/templates/brand_response_template.json",
      responsePath: "/tmp/responses/brand_response.json",
      handoffPolicy,
    });

    expect(block.safeMessage).toContain("Review brand without live changes.");
    expect(block.safeMessage).toContain("Recommendation is not routing");
    expect(block.safeMessage).toContain("CC · Journey · Editorial onboarding · Eligible");
    expect(block.safeMessage).toContain("liveApprovalGranted debe ser false");
    expect(block.openLiveGateCount).toBe(0);
    expect(block.onboardingHandoffPolicyStatus).toBe("mini_launch_onboarding_handoff_policy_ready_no_live_changes");
    expect(block.priority).toBe(1);
  });

  test("builds validation commands without executing them", () => {
    const commands = buildValidationCommands({
      responsesDir: "/tmp/review-responses",
    });

    expect(commands.createResponsesDir).toBe("mkdir -p /tmp/review-responses");
    expect(commands.intake).toContain("crm:vnext:mailerlite-mini-launch-department-review-intake");
    expect(commands.reconciliation).toContain("crm:vnext:mailerlite-mini-launch-department-review-reconciliation");
    expect(commands.reconciliation).toContain("/tmp/review-responses/brand_response.json");
  });

  test("builds follow-up policy with all live gates closed", () => {
    const policy = buildFollowUpPolicy({ packetsIndex, runbook, handoffPolicy });

    expect(policy.status).toBe("send_or_route_department_reviews_next_no_live");
    expect(policy.currentOpenLiveGateCount).toBe(0);
    expect(policy.onboardingHandoffTargetGroup).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(policy.sequence.join(" ")).toContain("recommendation is not routing");
    expect(policy.hardStops).toContain("No MailerLite group creation, asset build, workflow use, subscriber assignment or send.");
  });

  test("builds delivery pack sorted by Brand first and no live actions", async () => {
    const pack = await buildDeliveryPack({
      packetsIndex,
      runbook,
      handoffPolicy,
      templatesDir: "/tmp/templates",
      responsesDir: "/tmp/responses",
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
      readPacket: async (packet: any) => ({
        department: packet.department,
        markdown: packet.markdown,
        json: packet.json,
        packetMarkdownText: "md",
        packetJson: packetFiles[packet.json as keyof typeof packetFiles],
      }),
    } as any);

    expect(pack.status).toBe("department_review_delivery_pack_ready_no_live_changes");
    expect(pack.deliveries.map((delivery) => delivery.department)).toEqual(["brand", "crm", "web_design"]);
    expect(pack.followUpPolicy.onboardingHandoffPolicyStatus).toBe("mini_launch_onboarding_handoff_policy_ready_no_live_changes");
    expect(pack.liveGateSummary.openLiveGateCount).toBe(0);
    expect(pack.safety).toMatchObject({
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmCardMutationsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders markdown with message blocks and validation commands", async () => {
    const pack = await buildDeliveryPack({
      packetsIndex,
      runbook,
      handoffPolicy,
      templatesDir: "/tmp/templates",
      responsesDir: "/tmp/responses",
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
      readPacket: async (packet: any) => ({
        department: packet.department,
        markdown: packet.markdown,
        json: packet.json,
        packetMarkdownText: "md",
        packetJson: packetFiles[packet.json as keyof typeof packetFiles],
      }),
    } as any);
    const markdown = renderMarkdown(pack);

    expect(markdown).toContain("Department Review Delivery Pack");
    expect(markdown).toContain("Open live gates: 0");
    expect(markdown).toContain("Onboarding Handoff Boundary");
    expect(markdown).toContain("Recommendation is not routing");
    expect(markdown).toContain("Message block:");
    expect(markdown).toContain("crm:vnext:mailerlite-mini-launch-department-review-intake");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
    expect(buildSafety()).toMatchObject({ outboundPerformed: false });
  });
});
