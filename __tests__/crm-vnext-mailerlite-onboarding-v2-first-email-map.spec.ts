import { describe, expect, test } from "vitest";

import {
  buildFirstEmailMappingPacket,
  classifyFirstEmail,
  extractFirstEmail,
  extractKnownContentIds,
  historicalFirstEmailRule,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-first-email-map.mjs";

const auditReport = {
  status: "completed_read_only_audit",
  workflow: {
    graph: {
      emailSequence: [
        {
          order: 1,
          subject: "{$name}, Tu primera nota de mi parte ✍🏻",
          name: "Tu primera nota de mi parte",
          contentId: null,
          from: "notasdealejandro@coherenciacreativa.com",
          stepId: "step-1",
          emailId: "email-1",
        },
      ],
    },
  },
};

const designPacket = {
  status: "ready_for_human_architecture_review",
  workflowBlueprint: {
    emailReceipts: [
      {
        order: 1,
        subject: "{$name}, Tu primera nota de mi parte ✍🏻",
        name: "Tu primera nota de mi parte",
        contentId: null,
        dictionaryStatus: "needs_brand_content_mapping",
        recommendedReceiptGroup: null,
      },
    ],
  },
};

const taxonomy = `
| Tipo | Nombre publico | content_id | Grupo sugerido |
|---|---|---|---|
| article | Sobre el amor | \`article_sobre_el_amor\` | \`CC · Sent · Article · Sobre el amor\` |
| article | Relaciones que aumentan nuestra energia | \`article_relaciones_aumentan_energia\` | \`CC · Sent · Article · Relaciones que aumentan nuestra energia\` |
`;

const dictionary = `
| Nombre de grupo | Estado | Significado observado | Uso actual / riesgo | Regla |
|---|---|---|---|---|
| \`Se le envió el primer boletín\` | \`live_historical\` | Marcador posterior al primer email del onboarding. | Etapa historica; no dice contenido universal. | No usar como recibo canonico. |
`;

describe("CRM vNext MailerLite onboarding v2 first email map", () => {
  test("keeps default paths for local-only mapping", () => {
    const options = parseArgs([]);

    expect(options.audit).toContain("mailerlite_onboarding_v1_audit_2026-05-27.json");
    expect(options.designPacket).toContain("mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json");
    expect(options.receiptTaxonomy).toContain("MAILERLITE_RECEIPT_TAXONOMY_V0.md");
    expect(options.groupDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
  });

  test("extracts first email from audit before design packet", () => {
    const firstEmail = extractFirstEmail(auditReport, designPacket);

    expect(firstEmail).toMatchObject({
      subject: "{$name}, Tu primera nota de mi parte ✍🏻",
      contentId: null,
      from: "notasdealejandro@coherenciacreativa.com",
      designDictionaryStatus: "needs_brand_content_mapping",
    });
  });

  test("finds known Brand content ids and historical no-receipt rule", () => {
    expect(extractKnownContentIds(taxonomy, dictionary)).toEqual([
      "article_relaciones_aumentan_energia",
      "article_sobre_el_amor",
    ]);

    expect(historicalFirstEmailRule(dictionary)).toMatchObject({
      found: true,
      rule: "do_not_use_as_canonical_content_receipt",
    });
  });

  test("classifies the first note as welcome-only without a Sent receipt", () => {
    const firstEmail = extractFirstEmail(auditReport, designPacket);
    const classification = classifyFirstEmail({
      firstEmail,
      knownContentIds: extractKnownContentIds(taxonomy, dictionary),
      historicalRule: historicalFirstEmailRule(dictionary),
    });

    expect(classification).toMatchObject({
      recommendedPosture: "welcome_orientation_no_sent_receipt",
      confidence: "high",
    });
  });

  test("builds a no-live packet that does not create a new Sent group", () => {
    const packet = buildFirstEmailMappingPacket({
      auditReport,
      designPacket,
      receiptTaxonomyMarkdown: taxonomy,
      groupDictionaryMarkdown: dictionary,
      emailStyleCanonMarkdown: "Un email de Marca debe sentirse como carta/editorial",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("first_email_mapping_ready_no_sent_receipt");
    expect(packet.decision).toMatchObject({
      recommendedPosture: "welcome_orientation_no_sent_receipt",
      recommendedContentId: null,
      recommendedMailerLiteSentGroup: null,
      createNewSentGroup: false,
      addToOnboardingV2MissingGroups: false,
    });
    expect(packet.v2ImplementationGuidance.crmSignals[0]).toMatchObject({
      event: "journey_welcome_sent",
      notAContentReceipt: true,
    });
    expect(packet.safety.mailerLiteApiCalled).toBe(false);
  });

  test("renders Brand and CRM handoff boundaries", () => {
    const packet = buildFirstEmailMappingPacket({
      auditReport,
      designPacket,
      receiptTaxonomyMarkdown: taxonomy,
      groupDictionaryMarkdown: dictionary,
      emailStyleCanonMarkdown: "Un email de Marca debe sentirse como carta/editorial",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("welcome_orientation_no_sent_receipt");
    expect(markdown).toContain("grupo Sent recomendado: ninguno");
    expect(markdown).toContain("No asignar CC · Sent · Article · ... para Email 1");
    expect(markdown).toContain("Sin ediciones a Brand Hub.");
  });
});
