import { describe, expect, test } from "vitest";

import {
  buildDryRunPacket,
  buildExactApprovalPhrase,
  buildFormBody,
  buildJsonBody,
  buildSafety,
  buildVariantPlans,
  evaluateCampaignInertness,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-api-inert-draft-lab.mjs";

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

const inertCampaign = {
  id: "campaign-lab",
  name: "[LAB NO SEND] inert",
  status: "draft",
  type: "regular",
  filter: null,
  has_basic_filter: false,
  missing_data: ["recipients"],
  can_be_scheduled: false,
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  warnings: [],
};

describe("CRM vNext MailerLite API inert draft lab", () => {
  test("normalizes defaults and rejects unsafe API bases", () => {
    const parsed = parseArgs(["--timeout-ms", "15000", "--source-step", "2"]);

    expect(parsed.timeoutMs).toBe(15000);
    expect(parsed.sourceStep).toBe(2);
    expect(parsed.apiBase).toBe("https://connect.mailerlite.com/api");
    expect(parsed.out).toContain("mailerlite_api_inert_draft_lab");
    expect(() => parseArgs(["--api-base", "https://example.test/api"])).toThrow("unsafe_api_base_not_mailerlite");
  });

  test("builds local-only packet with a scoped exact approval phrase", () => {
    const packet = buildDryRunPacket({
      realQa,
      realQaRaw: JSON.stringify(realQa),
      options: parseArgs([]),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("mailerlite_api_inert_draft_lab_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.decision.exactApprovalPhrase).toBe(buildExactApprovalPhrase());
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.executiveSummary.canExecuteNow).toBe(false);
    expect(packet.variants).toHaveLength(4);
    expect(packet.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      tokensPrinted: false,
    });
  });

  test("variant plans are disposable and do not include real audience assignments", () => {
    const variants = buildVariantPlans({ runId: "test" });

    expect(variants.map((variant) => variant.id)).toEqual([
      "form_minimal_no_audience_fields",
      "json_minimal_no_audience_fields",
      "json_empty_audience_arrays",
      "form_minimal_then_put_empty_audience_arrays",
    ]);
    expect(variants.every((variant) => variant.disposableName.startsWith("[LAB NO SEND]"))).toBe(true);
    expect(variants.flatMap((variant) => variant.audienceFields).every((field) => field.includes("empty_array"))).toBe(true);
  });

  test("form and JSON builders keep recipients/groups/segments out unless explicitly empty", () => {
    const base = {
      name: "[LAB NO SEND] test",
      subject: "Subject",
      fromName: "Sender",
      fromEmail: "sender@example.test",
      replyTo: "reply@example.test",
      content: "<p>Hello</p>",
    };

    const formBody = buildFormBody(base);
    const jsonBody = buildJsonBody(base);
    const jsonEmptyAudience = buildJsonBody({ ...base, audience: { groups: [], segments: [] } });

    expect(Object.keys(formBody).some((key) => /group|segment|subscriber|recipient/i.test(key))).toBe(false);
    expect(JSON.stringify(jsonBody)).not.toMatch(/group|segment|subscriber|recipient/i);
    expect(jsonEmptyAudience.groups).toEqual([]);
    expect(jsonEmptyAudience.segments).toEqual([]);
  });

  test("classifies truly inert and unsafe basic-filter drafts", () => {
    const inert = evaluateCampaignInertness(inertCampaign);
    expect(inert.inert).toBe(true);
    expect(inert.failed).toEqual([]);

    const unsafe = evaluateCampaignInertness({
      ...inertCampaign,
      filter: [],
      has_basic_filter: true,
      missing_data: [],
      can_be_scheduled: true,
    });

    expect(unsafe.inert).toBe(false);
    expect(unsafe.failed).toEqual(expect.arrayContaining([
      "filter_absent_or_null",
      "no_basic_filter",
      "recipients_missing",
      "cannot_schedule_without_recipients",
    ]));
    expect(unsafe.redactedObserved.filterState).toBe("array:0");
  });

  test("execute safety allows only disposable create/delete lab mutations", () => {
    const safety = buildSafety({ execute: true, apiCalled: true, created: 4, deleted: 4 });

    expect(safety.mailerLiteMutationsPerformed).toBe(true);
    expect(safety.allowedMutationType).toBe("create_inspect_delete_disposable_lab_draft_campaigns_only");
    expect(safety.originalDraftsEditedOrDeleted).toBe(false);
    expect(safety.sendsPerformed).toBe(false);
    expect(safety.subscribersRead).toBe(false);
    expect(safety.groupsCreatedOrAssigned).toBe(false);
    expect(safety.senderValuesPrinted).toBe(false);
  });

  test("markdown does not expose sender values or tokens", () => {
    const packet = buildDryRunPacket({
      realQa,
      realQaRaw: JSON.stringify(realQa),
      options: parseArgs([]),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Exact approval phrase available: true");
    expect(markdown).not.toContain("sender@example.test");
    expect(markdown).not.toContain("campaign-e01");
    expect(markdown).toContain("Tokens printed: false");
  });
});
