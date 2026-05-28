import { describe, expect, test } from "vitest";

import {
  buildTaxonomyConsolidationAudit,
  parseBrandDictionaryRows,
  parseCrmManifestRows,
} from "../scripts/crm-vnext-mailerlite-launch-os-taxonomy-consolidation-audit.mjs";

const brandDictionaryMarkdown = `
# Dictionary

| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |
|---|---|---|---|---|---|
| \`CC · Source · Resource · Brújula\` | Source | \`live_canonical\` | Brújula source. | Cohorte. | \`source=brujula\` |
| \`CC · Source · IG onboarding\` | Source | \`proposed_local\` | IG source. | Cohorte. | \`source=ig_onboarding\` |
| \`CC · Source · Quiz · Inteligencia para descansar\` | Source | \`proposed_local\` | Quiz source. | Cohorte. | \`source=inteligencia_para_descansar\` |

| Nombre de grupo | Capa | Estado | content_id | Uso |
|---|---|---|---|---|
| \`CC · Sent · Article · Relaciones que aumentan nuestra energia\` | Sent | \`proposed_local\` | \`article_relaciones_aumentan_energia\` | Marcador. |
`;

const crmManifestMarkdown = `
# Manifest

\`\`\`json
{
  "groups": [
    {
      "name": "CC · Source · Resource · Brújula",
      "liveGroupId": "188581887447401645",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Source"
    },
    {
      "name": "CC · Source · IG onboarding",
      "layer": "Source"
    },
    {
      "name": "CC · Sent · Article · Relaciones que aumentan nuestra energia",
      "layer": "Sent"
    }
  ]
}
\`\`\`
`;

const firstBatchExecution = {
  createdGroups: [
    {
      id: "188581887447401645",
      name: "CC · Source · Resource · Brújula",
    },
  ],
};

const onboardingV2Execution = {
  createdGroups: [
    {
      id: "188667906749367606",
      name: "CC · Source · IG onboarding",
    },
    {
      id: "188667909471471351",
      name: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    },
  ],
};

const miniLaunchExecution = {
  createdGroups: [
    {
      id: "188664860533327011",
      name: "CC · Source · Quiz · Inteligencia para descansar",
    },
  ],
};

describe("CRM vNext MailerLite Launch OS taxonomy consolidation audit", () => {
  test("parses Brand dictionary rows across canonical and article tables", () => {
    const rows = parseBrandDictionaryRows(brandDictionaryMarkdown);

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.name)).toContain("CC · Source · IG onboarding");
    expect(rows.find((row) => row.name === "CC · Sent · Article · Relaciones que aumentan nuestra energia")).toMatchObject({
      layer: "Sent",
      status: "proposed_local",
      contentId: "article_relaciones_aumentan_energia",
    });
  });

  test("parses the CRM manifest JSON block", () => {
    const rows = parseCrmManifestRows(crmManifestMarkdown);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      name: "CC · Source · Resource · Brújula",
      liveGroupId: "188581887447401645",
    });
  });

  test("reconciles live execution evidence against Brand and CRM caches without opening gates", () => {
    const report = buildTaxonomyConsolidationAudit({
      brandDictionaryMarkdown,
      crmManifestMarkdown,
      firstBatchExecution,
      onboardingV2Execution,
      miniLaunchExecution,
      paths: {
        firstBatchExecution: "/tmp/first.json",
        onboardingV2Execution: "/tmp/onboarding.json",
        miniLaunchExecution: "/tmp/mini.json",
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      liveEvidenceGroupCount: 4,
      brandPromotionNeededCount: 3,
      crmManifestRefreshNeededCount: 3,
      allLiveEvidenceRepresentedInBrandDictionary: true,
      allLiveEvidencePromotedInBrandDictionary: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(report.brandPromotionNeeded.map((row) => row.name)).toEqual([
      "CC · Source · IG onboarding",
      "CC · Sent · Article · Relaciones que aumentan nuestra energia",
      "CC · Source · Quiz · Inteligencia para descansar",
    ]);
    expect(report.crmManifestRefreshNeeded.map((row) => row.name)).toEqual([
      "CC · Source · IG onboarding",
      "CC · Sent · Article · Relaciones que aumentan nuestra energia",
      "CC · Source · Quiz · Inteligencia para descansar",
    ]);
    expect(report.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      groupMutationsPerformed: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
