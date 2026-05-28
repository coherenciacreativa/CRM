import { describe, expect, test } from "vitest";

import {
  buildRealMailerLiteRenderQa,
  campaignIdsFromDryRun,
  evaluateCampaignDraft,
  expectedFragmentsForPayload,
  parseArgs,
  renderMarkdown,
  stripHtmlToText,
} from "../scripts/crm-vnext-mailerlite-mini-launch-real-mailerlite-render-qa.mjs";

const payload = {
  step: 1,
  role: "delivery_and_orientation",
  mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
  subject: "Tu lectura: qué tipo de descanso está pidiendo tu mente",
  preheader: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea.",
  contentBlocks: [
    { id: "email_1_preheader", type: "preheader", text: "Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea." },
    { id: "email_1_greeting", type: "greeting", text: "Hola," },
    { id: "email_1_paragraph_1", type: "paragraph", text: "Gracias por hacer Inteligencia para descansar." },
    {
      id: "email_1_paragraph_2",
      type: "paragraph",
      text: "Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte.",
    },
    {
      id: "email_1_cta",
      type: "cta",
      text: "Ver mi lectura y práctica",
      destination: "result_or_resource_link_placeholder",
      placeholder: {
        value: "result_or_resource_link_placeholder",
      },
    },
    { id: "email_1_closing", type: "closing", text: "Un abrazo, Alejandro" },
    { id: "email_1_footer", type: "compliance_footer", text: "MailerLite footer." },
  ],
};

const safeCampaign = (content: string) => ({
  id: "campaign-1",
  name: payload.mailerLiteAssetNameDraft,
  status: "draft",
  type: "regular",
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  filter: null,
  has_basic_filter: false,
  missing_data: ["recipients"],
  warnings: [],
  can_be_scheduled: false,
  emails: [
    {
      subject: payload.subject,
      preheader: payload.preheader,
      content,
    },
  ],
});

const exactHtml = [
  "<p>Hola,</p>",
  "<p>Gracias por hacer Inteligencia para descansar.</p>",
  "<p>Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte.</p>",
  "<p>Ver mi lectura y práctica</p>",
  "<p>result_or_resource_link_placeholder</p>",
  "<p>Un abrazo, Alejandro</p>",
].join("");

const payloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  payloads: [payload],
};

const dryRun = {
  status: "dry_run_ready_for_exact_asset_build_approval",
  targetPlan: [
    {
      step: 1,
      draftCampaignId: "campaign-1",
      plannedOperation: "update_existing_draft_campaign",
    },
  ],
};

describe("CRM vNext MailerLite mini-launch real MailerLite render QA", () => {
  test("parses defaults and validates the MailerLite API base", () => {
    const parsed = parseArgs(["--timeout-ms", "45000", "--out", "/tmp/qa.json"]);

    expect(parsed.payloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emailAssetBuildDryRun).toContain("mailerlite_mini_launch_email_asset_build_dry_run_after_manual_ui_inteligencia_descansar_2026-05-28.json");
    expect(parsed.timeoutMs).toBe(45000);
    expect(parsed.out).toBe("/tmp/qa.json");
    expect(() => parseArgs(["--api-base", "https://example.com"])).toThrow("unsafe_api_base_not_mailerlite");
  });

  test("extracts campaign IDs from the post-manual-UI dry-run", () => {
    expect(campaignIdsFromDryRun(dryRun).get(1)).toBe("campaign-1");
  });

  test("checks exact fragments while ignoring footer/signature placeholders", () => {
    const fragments = expectedFragmentsForPayload(payload);

    expect(fragments.map((fragment) => fragment.id)).toEqual([
      "email_1_greeting",
      "email_1_paragraph_1",
      "email_1_paragraph_2",
      "email_1_cta",
      "email_1_cta_placeholder",
      "email_1_closing",
    ]);
    expect(stripHtmlToText("<p>Hola&nbsp;&amp; gracias</p>")).toBe("Hola & gracias");
  });

  test("marks the real drafts green only when exact copy and safety gates match", () => {
    const packet = buildRealMailerLiteRenderQa({
      payloadManifest,
      emailAssetBuildDryRun: dryRun,
      campaignsById: new Map([["campaign-1", safeCampaign(exactHtml)]]),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.status).toBe("mini_launch_real_mailerlite_render_qa_green_no_live_changes");
    expect(packet.ok).toBe(true);
    expect(packet.executiveSummary).toMatchObject({
      draftCount: 1,
      allRequiredContentExact: true,
      allSafetyGatesClosed: true,
      seedSendReady: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: true,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      subscriberMutationsPerformed: false,
    });
    expect(markdown).toContain("Status: mini_launch_real_mailerlite_render_qa_green_no_live_changes");
  });

  test("blocks when the UI draft body is present but exact accented copy is not", () => {
    const degradedHtml = exactHtml
      .replace("aquí", "aqu")
      .replace("diagnóstico", "diagnstico")
      .replace("Ver mi lectura y práctica", "Ver mi lectura y prctica");
    const packet = buildRealMailerLiteRenderQa({
      payloadManifest,
      emailAssetBuildDryRun: dryRun,
      campaignsById: new Map([["campaign-1", safeCampaign(degradedHtml)]]),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const draft = packet.drafts[0];

    expect(packet.status).toBe("mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes");
    expect(packet.ok).toBe(false);
    expect(packet.blockers).toContain("content_mismatch_step_1");
    expect(draft.content.missingRequiredFragments.map((item) => item.id)).toEqual([
      "email_1_paragraph_2",
      "email_1_cta",
    ]);
    expect(draft.safetyChecks.allSafetyGatesClosed).toBe(true);
  });

  test("blocks on safety drift even if content is exact", () => {
    const unsafeCampaign = {
      ...safeCampaign(exactHtml),
      scheduled_for: "2026-06-01 09:00:00",
      missing_data: [],
      can_be_scheduled: true,
    };
    const draft = evaluateCampaignDraft({
      payload,
      campaignId: "campaign-1",
      campaign: unsafeCampaign,
    });

    expect(draft.content.allRequiredFragmentsExact).toBe(true);
    expect(draft.safetyChecks.allSafetyGatesClosed).toBe(false);
    expect(draft.safetyChecks.failedSafetyChecks).toEqual(expect.arrayContaining([
      "not_scheduled",
      "recipients_missing",
      "cannot_schedule_without_recipients",
    ]));
  });
});
