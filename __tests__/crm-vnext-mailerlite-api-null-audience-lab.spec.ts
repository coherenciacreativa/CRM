import { describe, expect, test } from "vitest";

import {
  SAFETY_GROUP_NAME,
  buildDryRunPacket,
  buildExactApprovalPhrase,
  buildFormBody,
  buildJsonBody,
  buildSafety,
  buildVariantPlans,
  evaluateNullAudienceCampaign,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-api-null-audience-lab.mjs";

const realQa = {
  status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  drafts: [
    { step: 1, campaignId: "campaign-e01" },
    { step: 2, campaignId: "campaign-e02" },
  ],
};

const nullAudienceCampaign = {
  id: "campaign-lab",
  name: "[LAB NULL AUDIENCE] test",
  status: "draft",
  type: "regular",
  filter: [
    [
      {
        operator: "in",
        args: ["groups", ["group-null"]],
      },
    ],
  ],
  has_basic_filter: true,
  missing_data: [],
  can_be_scheduled: true,
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  warnings: [],
};

describe("CRM vNext MailerLite API Null Audience lab", () => {
  test("normalizes defaults and rejects unsafe API bases", () => {
    const parsed = parseArgs(["--timeout-ms", "15000", "--source-step", "2"]);

    expect(parsed.timeoutMs).toBe(15000);
    expect(parsed.sourceStep).toBe(2);
    expect(parsed.apiBase).toBe("https://connect.mailerlite.com/api");
    expect(parsed.out).toContain("mailerlite_api_null_audience_lab");
    expect(() => parseArgs(["--api-base", "https://example.test/api"])).toThrow("unsafe_api_base_not_mailerlite");
  });

  test("builds local-only packet with scoped exact approval phrase", () => {
    const packet = buildDryRunPacket({
      realQa,
      realQaRaw: JSON.stringify(realQa),
      options: parseArgs([]),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("mailerlite_api_null_audience_lab_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.decision.exactApprovalPhrase).toBe(buildExactApprovalPhrase());
    expect(packet.decision.exactApprovalPhrase).toContain(SAFETY_GROUP_NAME);
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.executiveSummary.canExecuteNow).toBe(false);
    expect(packet.variants).toHaveLength(2);
    expect(packet.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      tokensPrinted: false,
    });
  });

  test("variant plans are disposable and assigned only to the safety audience concept", () => {
    const variants = buildVariantPlans({ runId: "test" });

    expect(variants.map((variant) => variant.id)).toEqual([
      "json_single_empty_safety_group",
      "form_single_empty_safety_group",
    ]);
    expect(variants.every((variant) => variant.disposableName.startsWith("[LAB NULL AUDIENCE]"))).toBe(true);
    expect(variants.flatMap((variant) => variant.audienceFields)).toEqual(expect.arrayContaining([
      "groups:single_empty_safety_group",
    ]));
  });

  test("form and JSON builders target only the safety group", () => {
    const base = {
      name: "[LAB NULL AUDIENCE] test",
      subject: "Subject",
      fromName: "Sender",
      fromEmail: "sender@example.test",
      replyTo: "reply@example.test",
      content: "<p>Hello</p>",
      groupId: "group-null",
    };

    const formBody = buildFormBody(base);
    const jsonBody = buildJsonBody(base);

    expect(formBody["groups[]"]).toEqual(["group-null"]);
    expect(Object.keys(formBody).some((key) => /segment|subscriber|recipient/i.test(key))).toBe(false);
    expect(jsonBody.groups).toEqual(["group-null"]);
    expect(jsonBody.segments).toEqual([]);
    expect(JSON.stringify(jsonBody)).not.toMatch(/subscriber|recipient/i);
  });

  test("classifies a Null Audience campaign and rejects non-exclusive filters", () => {
    const safe = evaluateNullAudienceCampaign({
      campaign: nullAudienceCampaign,
      groupId: "group-null",
      groupActiveCount: 0,
    });

    expect(safe.nullAudienceSafe).toBe(true);
    expect(safe.failed).toEqual([]);
    expect(safe.redactedObserved.filterGroupIdSha256).toBeTruthy();

    const unsafe = evaluateNullAudienceCampaign({
      campaign: {
        ...nullAudienceCampaign,
        filter: [[{ operator: "in", args: ["groups", ["group-null", "group-live"]] }]],
      },
      groupId: "group-null",
      groupActiveCount: 0,
    });

    expect(unsafe.nullAudienceSafe).toBe(false);
    expect(unsafe.failed).toContain("filter_points_only_to_null_group");

    const nonEmpty = evaluateNullAudienceCampaign({
      campaign: nullAudienceCampaign,
      groupId: "group-null",
      groupActiveCount: 1,
    });

    expect(nonEmpty.nullAudienceSafe).toBe(false);
    expect(nonEmpty.failed).toContain("null_group_active_count_zero");
  });

  test("execute safety allows only safety-group and disposable lab mutations", () => {
    const safety = buildSafety({
      execute: true,
      apiCalled: true,
      groupsRead: 80,
      safetyGroupsCreated: 1,
      created: 2,
      deleted: 2,
    });

    expect(safety.mailerLiteMutationsPerformed).toBe(true);
    expect(safety.allowedMutationType).toBe("create_or_use_empty_safety_group_and_create_inspect_delete_disposable_null_audience_lab_campaigns_only");
    expect(safety.originalDraftsEditedOrDeleted).toBe(false);
    expect(safety.realLaunchDraftsCreatedOrEdited).toBe(false);
    expect(safety.realCampaignAudienceAssignmentsPerformed).toBe(false);
    expect(safety.sendsPerformed).toBe(false);
    expect(safety.subscribersRead).toBe(false);
    expect(safety.additionalGroupsCreatedOrAssigned).toBe(false);
    expect(safety.safetyGroupIdPrinted).toBe(false);
  });

  test("markdown does not expose sender values or IDs", () => {
    const packet = buildDryRunPacket({
      realQa,
      realQaRaw: JSON.stringify(realQa),
      options: parseArgs([]),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Exact approval phrase available: true");
    expect(markdown).toContain(SAFETY_GROUP_NAME);
    expect(markdown).not.toContain("sender@example.test");
    expect(markdown).not.toContain("campaign-e01");
    expect(markdown).toContain("IDs/sender values/tokens printed: false/false");
  });
});
