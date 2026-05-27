import { describe, expect, test } from "vitest";

import {
  buildOnboardingV2Packet,
  parseDictionaryGroups,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-design-packet.mjs";

const dictionary = `
| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |
|---|---|---|---|---|---|
| \`CC · Source · IG onboarding\` | Source | \`proposed_local\` | Source clean. | Routing. | \`source=ig_onboarding\` |
| \`CC · Journey · Editorial onboarding · Eligible\` | Journey | \`live_canonical\` | Eligible. | Trigger. | \`journey.editorial_onboarding.eligible=true\` |
| \`CC · Journey · Editorial onboarding · In progress\` | Journey | \`proposed_local\` | In progress. | State. | \`journey.editorial_onboarding.status=in_progress\` |
| \`CC · Journey · Editorial onboarding · Complete\` | Journey | \`proposed_local\` | Complete. | State. | \`journey.editorial_onboarding.status=complete\` |
| \`CC · Audience · General newsletter · Eligible\` | Audience | \`live_canonical\` | Audience. | Sends. | \`audience.general_newsletter.eligible=true\` |
| \`CC · Sent · Article · Sobre el amor\` | Sent | \`live_canonical\` | Sent marker. | Dedupe. | \`content.sent=article_sobre_el_amor\` |
| \`CC · Sent · Article · Relaciones que aumentan nuestra energia\` | Sent | \`proposed_local\` | Sent marker. | Dedupe. | \`content.sent=article_relaciones_aumentan_energia\` |

- \`CC · Journey · Editorial onboarding · Eligible\`: \`mailerLiteGroupId=eligible-id\`, \`estado=live_canonical\`.
- \`CC · Audience · General newsletter · Eligible\`: \`mailerLiteGroupId=audience-id\`, \`estado=live_canonical\`.
- \`CC · Sent · Article · Sobre el amor\`: \`mailerLiteGroupId=sobre-id\`, \`estado=live_canonical\`.
`;

const auditReport = {
  status: "completed_read_only_audit",
  workflow: {
    id: "154049547088167956",
    name: "Onboarding flow",
    enabled: true,
    stepsCount: 27,
    graph: {
      emailSequence: [
        {
          order: 1,
          subject: "{$name}, Tu primera nota de mi parte",
          name: "Tu primera nota de mi parte",
          contentId: null,
        },
        {
          order: 2,
          subject: "Relaciones que aumentan nuestra energía",
          name: "Segundo correo",
          contentId: "article_relaciones_aumentan_energia",
        },
        {
          order: 3,
          subject: "Sobre el amor",
          name: "Tercer correo",
          contentId: "article_sobre_el_amor",
        },
      ],
    },
  },
  historicalGroups: [
    { name: "Received second email", recommendedPosture: "do_not_use_as_content_receipt" },
    { name: "Onboarding complete", recommendedPosture: "keep_live_until_migration" },
  ],
  migrationRecommendation: {
    option: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
};

describe("CRM vNext MailerLite onboarding v2 design packet", () => {
  test("parses Brand dictionary rows and live canonical ids", () => {
    const groups = parseDictionaryGroups(dictionary);

    expect(groups.find((group) => group.name === "CC · Sent · Article · Sobre el amor")).toMatchObject({
      status: "live_canonical",
      mailerLiteGroupId: "sobre-id",
    });
    expect(groups.find((group) => group.name === "CC · Source · IG onboarding")).toMatchObject({
      status: "proposed_local",
      mailerLiteGroupId: null,
    });
  });

  test("builds v2 as a local-only B-light design with no live permission", () => {
    const packet = buildOnboardingV2Packet({
      auditReport,
      dictionaryGroups: parseDictionaryGroups(dictionary),
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.decision.recommendedOption).toBe("option_b_light_clone_onboarding_v2_then_switch_entry");
    expect(packet.workflowBlueprint.productionV1Posture).toBe("keep_live_untouched");
    expect(packet.workflowBlueprint.trigger.group.name).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(packet.workflowBlueprint.trigger.rationale).toContain("no por el grupo historico CSV");
    expect(packet.approvalGates.every((gate) => gate.allowedNow === false)).toBe(true);
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
    });
  });

  test("does not infer Sobre el amor from Received second email", () => {
    const packet = buildOnboardingV2Packet({
      auditReport,
      dictionaryGroups: parseDictionaryGroups(dictionary),
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    const receivedRule = packet.legacyBackfillRules.find((rule) => rule.legacyGroup === "Received second email");
    expect(receivedRule).toMatchObject({
      posture: "crm_review_only_not_content_receipt",
      explicitNonInference: "No inferir CC · Sent · Article · Sobre el amor desde este grupo.",
    });
  });

  test("marks first email as needing Brand mapping and maps known article receipts", () => {
    const packet = buildOnboardingV2Packet({
      auditReport,
      dictionaryGroups: parseDictionaryGroups(dictionary),
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.workflowBlueprint.emailReceipts[0]).toMatchObject({
      dictionaryStatus: "needs_brand_content_mapping",
      recommendedReceiptGroup: null,
    });
    expect(packet.workflowBlueprint.emailReceipts[1]).toMatchObject({
      recommendedReceiptGroup: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
      dictionaryStatus: "proposed_local",
    });
    expect(packet.workflowBlueprint.emailReceipts[2]).toMatchObject({
      recommendedReceiptGroup: "CC · Sent · Article · Sobre el amor",
      dictionaryStatus: "live_canonical",
      mailerLiteGroupId: "sobre-id",
    });
  });

  test("renders approval gates and local-only safety into Markdown", () => {
    const packet = buildOnboardingV2Packet({
      auditReport,
      dictionaryGroups: parseDictionaryGroups(dictionary),
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Onboarding v2 Decision/Design Packet");
    expect(markdown).toContain("clone_or_build_disabled_v2_workflow: allowedNow=false");
    expect(markdown).toContain("Sin llamadas a la API de MailerLite.");
    expect(markdown).toContain("Sin lectura ni impresion de filas de subscribers.");
  });
});
