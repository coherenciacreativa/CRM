import { describe, expect, test } from "vitest";

import {
  buildAuditFromLiveState,
  buildStepGraph,
  mapHistoricalGroups,
  recommendMigrationOption,
  summarizeStep,
  validateMailerLiteApiBase,
} from "../scripts/crm-vnext-mailerlite-onboarding-v1-audit.mjs";

describe("CRM vNext MailerLite onboarding v1 audit", () => {
  test("rejects unsafe api bases before credential use", () => {
    expect(() => validateMailerLiteApiBase("https://connect.mailerlite.com/api")).not.toThrow();
    expect(() => validateMailerLiteApiBase("https://example.com/api")).toThrow(/unsafe_api_base_not_mailerlite/);
    expect(() => validateMailerLiteApiBase("http://127.0.0.1:3000/api")).toThrow(/unsafe_api_base_not_mailerlite/);
  });

  test("summarizes email steps without exposing body/plain text/html content", () => {
    const summary = summarizeStep({
      id: "email-step",
      type: "email",
      name: "Segundo correo",
      subject: "Relaciones que aumentan nuestra energía",
      plain_text: "PRIVATE BODY SHOULD NOT LEAK",
      html: "<p>PRIVATE HTML</p>",
      content: "PRIVATE CONTENT",
      email: {
        id: "email-id",
        plain_text: "NESTED PRIVATE BODY",
        html: "<p>NESTED PRIVATE HTML</p>",
        stats: { sent: 10, opens_count: 5, clicks_count: 1 },
      },
    });

    expect(JSON.stringify(summary)).not.toContain("PRIVATE");
    expect(summary).toMatchObject({
      id: "email-step",
      type: "email",
      emailId: "email-id",
      contentId: "article_relaciones_aumentan_energia",
      stats: { sent: 10, opens: 5, clicks: 1 },
    });
  });

  test("maps historical onboarding groups without treating Received second email as proof of Sobre el amor", () => {
    const graph = buildStepGraph([
      {
        id: "condition",
        type: "condition",
        yes_step_id: "email1",
        conditions: [{ type: "group_membership", group_id: "g-will", group: { id: "g-will", name: "will get first email" } }],
      },
      { id: "email1", type: "email", parent_id: "condition", subject: "Tu primera nota" },
      {
        id: "action",
        type: "action",
        parent_id: "email1",
        action_type: "move_to_group",
        from_groups: [{ id: "g-first", name: "Se le envió el primer boletín", active_count: 1 }],
        to_groups: [{ id: "g-received", name: "Received second email", active_count: 2 }],
      },
    ]);

    const mapped = mapHistoricalGroups({
      groups: [
        { id: "g-will", name: "will get first email", active_count: 94 },
        { id: "g-received", name: "Received second email", active_count: 62 },
      ],
      triggers: [{ groupIds: ["g-will"] }],
      graph,
    });

    expect(mapped.find((group) => group.name === "Received second email")).toMatchObject({
      role: "legacy_in_progress_bucket",
      recommendedPosture: "do_not_use_as_content_receipt",
      vNextMapping: expect.stringContaining("Relaciones que aumentan nuestra energia"),
    });
    expect(mapped.find((group) => group.name === "Received second email")?.vNextMapping).not.toContain("Sobre el amor");
  });

  test("recommends v2 clone path for active complex onboarding", () => {
    const recommendation = recommendMigrationOption({
      workflow: { found: true, enabled: true },
      emailSequence: Array.from({ length: 11 }, (_, index) => ({ order: index + 1 })),
      historicalGroups: [
        { name: "Onboarding complete", exists: true, role: "legacy_completion_and_campaign_audience" },
        { name: "Received second email", exists: true, role: "legacy_in_progress_bucket" },
      ],
    });

    expect(recommendation).toMatchObject({
      option: "option_b_light_clone_onboarding_v2_then_switch_entry",
      confidence: "medium_high",
    });
  });

  test("builds a read-only audit without subscriber rows or live-change permission", () => {
    const report = buildAuditFromLiveState({
      options: { workflowId: "workflow-1", workflowName: "Onboarding flow" },
      collections: {
        groups: {
          ok: true,
          count: 3,
          items: [
            { id: "g-trigger", name: "leads_instagram.csv", active_count: 10 },
            { id: "g-received", name: "Received second email", active_count: 20 },
            { id: "g-complete", name: "Onboarding complete", active_count: 30 },
          ],
        },
        automations: { ok: true, count: 1, items: [] },
        fields: { ok: true, count: 0, items: [] },
        segments: { ok: true, count: 0, items: [] },
        forms: { ok: true, count: 0, items: [], endpointReads: [] },
      },
      workflowDetail: {
        id: "workflow-1",
        name: "Onboarding flow",
        enabled: true,
        complete: true,
        broken: false,
        qualified_subscribers_count: 7,
        triggers: [{ id: "t1", type: "subscriber_joins_group", group_ids: ["g-trigger"], groups: [{ id: "g-trigger", name: "leads_instagram.csv" }] }],
        steps: [
          { id: "root", type: "condition", yes_step_id: "email1", conditions: [] },
          { id: "email1", type: "email", parent_id: "root", subject: "Relaciones que aumentan nuestra energía" },
          { id: "email2", type: "email", parent_id: "email1", subject: "Sobre el amor" },
        ],
      },
    });

    expect(report.status).toBe("completed_read_only_audit");
    expect(report.queueVisibility).toMatchObject({ qualifiedSubscribersCount: 7, subscriberRowsRead: 0 });
    expect(report.safety).toMatchObject({
      readOnly: true,
      mailerLiteMutationsPerformed: false,
      subscriberRowsRead: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
    });
  });
});
