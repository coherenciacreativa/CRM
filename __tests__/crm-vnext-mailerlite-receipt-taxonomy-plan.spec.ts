import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildLiveGroupInventory,
  planGroups,
  readBrandDictionary,
  validateBrandAlignment,
  validateMailerLiteApiBase,
  workflowUseStatusFor,
} from "../scripts/crm-vnext-mailerlite-receipt-taxonomy-plan.mjs";

const brandDictionaryMarkdown = `
# Brand Dictionary Fixture

| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |
|---|---|---|---|---|---|
| \`CC · Source · Resource · Brújula\` | Source | \`proposed_local\` | Persona llego por Brújula. | Cohorte de Brújula. | \`source_type=lead_magnet; source=brujula\` |
| \`CC · Sent · Article · Sobre el amor\` | Sent | \`proposed_local\` | El sistema marco como enviado Sobre el amor. | Dedupe sin implicar lectura. | \`content.sent=article_sobre_el_amor\` |
| \`CC · Source · Quiz · Energia renovada\` | Source | \`candidate\` | Posible origen quiz. | Requiere revisar nombre real. | \`source_type=quiz; source=energia_renovada\` |
`;

const withBrandDictionary = async <T>(fn: (path: string) => Promise<T>) => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-brand-dictionary-"));
  try {
    const path = join(dir, "brand.md");
    await writeFile(path, brandDictionaryMarkdown, "utf8");
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("CRM vNext MailerLite receipt taxonomy planner", () => {
  test("rejects non-MailerLite api bases before any token could be sent", () => {
    expect(() => validateMailerLiteApiBase("https://connect.mailerlite.com/api")).not.toThrow();
    expect(() => validateMailerLiteApiBase("http://127.0.0.1:3000/api")).toThrow(/unsafe_api_base_not_mailerlite/);
    expect(() => validateMailerLiteApiBase("https://example.com/api")).toThrow(/unsafe_api_base_not_mailerlite/);
  });

  test("makes Brand drift a semantic blocking issue, not a name-only warning", async () => {
    await withBrandDictionary(async (path) => {
      const brandDictionary = await readBrandDictionary(path);
      const manifest = {
        groups: [
          {
            name: "CC · Source · Resource · Brújula",
            layer: "Delivered",
            purpose: "Wrong layer should block.",
            safeToCreateEmpty: true,
          },
          {
            name: "CC · Sent · Article · Sobre el amor",
            layer: "Sent",
            contentId: "article_wrong",
            purpose: "Wrong content id should block.",
            safeToCreateEmpty: true,
          },
          {
            name: "CC · Source · Not In Brand",
            layer: "Source",
            purpose: "Missing Brand entry should block.",
            safeToCreateEmpty: true,
          },
        ],
      };

      const alignment = validateBrandAlignment({ manifest, brandDictionary });

      expect(alignment.ok).toBe(false);
      expect(alignment.blockingIssues.map((issue) => issue.type)).toEqual(expect.arrayContaining([
        "layer_mismatch",
        "content_id_mismatch",
        "missing_from_brand_canon",
      ]));
    });
  });

  test("does not treat Brand candidate status as create-approved", async () => {
    await withBrandDictionary(async (path) => {
      const brandDictionary = await readBrandDictionary(path);
      const manifest = {
        groups: [
          {
            name: "CC · Source · Quiz · Energia renovada",
            layer: "Source",
            purpose: "Candidate should not be marked create-safe.",
            safeToCreateEmpty: true,
          },
        ],
      };

      const alignment = validateBrandAlignment({ manifest, brandDictionary });

      expect(alignment.ok).toBe(false);
      expect(alignment.blockingIssues[0]).toMatchObject({
        type: "brand_status_not_approved_for_empty_create",
        brandStatus: "candidate",
      });
    });
  });

  test("requires live disabled/inactive pilot workflow state before pilot-use safety", () => {
    const base = {
      entry: { safeToUseInDisabledPilotAfterQa: true },
      touchesProtectedWorkflow: false,
      registeredInBrandCanon: true,
      brandIssues: [],
      manifest: { policy: { pilotWorkflows: ["Brújula Workflow"] } },
    };

    expect(workflowUseStatusFor({
      ...base,
      relatedWorkflows: [{ name: "Brújula Workflow", exists: true, live: { enabled: false } }],
    })).toBe("safe_to_use_in_disabled_pilot_after_qa");

    expect(workflowUseStatusFor({
      ...base,
      relatedWorkflows: [{ name: "Brújula Workflow", exists: true, live: { enabled: true } }],
    })).toBe("pilot_workflow_not_verified_disabled");
  });

  test("safe empty creation never implies workflow attachment permission", async () => {
    await withBrandDictionary(async (path) => {
      const brandDictionary = await readBrandDictionary(path);
      const manifest = {
        policy: { doNotTouchActiveWorkflows: ["Onboarding flow"] },
        groups: [
          {
            name: "CC · Source · Resource · Brújula",
            layer: "Source",
            purpose: "Create-empty can be safe while workflow use remains blocked.",
            relatedWorkflows: ["Onboarding flow"],
            safeToCreateEmpty: true,
            safeToUseInDisabledPilotAfterQa: false,
          },
        ],
      };
      const brandAlignment = validateBrandAlignment({ manifest, brandDictionary });

      const [planned] = planGroups({
        manifest,
        brandDictionary,
        brandAlignment,
        groups: [],
        workflows: [{ id: "workflow-1", name: "Onboarding flow", enabled: true }],
      });

      expect(planned.emptyGroupCreationStatus).toBe("safe_to_create_empty_after_approval");
      expect(planned.workflowUseStatus).toBe("protected_active_workflow_related");
      expect(planned.workflowAttachmentAllowed).toBe(false);
      expect(planned.requiresSeparateWorkflowMigrationGate).toBe(true);
      expect(planned.requiresProtectedWorkflowMigrationGate).toBe(true);
      expect(planned.allowedOperation).toBe("create_named_empty_group_only_after_explicit_approval");
    });
  });

  test("lists unknown live groups without subscriber reads", async () => {
    await withBrandDictionary(async (path) => {
      const brandDictionary = await readBrandDictionary(path);
      const manifest = {
        policy: { doNotTouchHistoricGroups: ["leads_instagram.csv"] },
        groups: [
          {
            name: "CC · Source · Resource · Brújula",
            relatedHistoricGroups: ["Brújula de Claridad — Guía gratuita"],
          },
        ],
      };

      const inventory = buildLiveGroupInventory({
        manifest,
        brandDictionary,
        groups: [
          { id: "1", name: "leads_instagram.csv" },
          { id: "2", name: "Unmapped Legacy Group" },
          { id: "3", name: "CC · Source · Resource · Brújula" },
        ],
      });

      expect(inventory.unknownLiveGroups).toEqual([{
        id: "2",
        name: "Unmapped Legacy Group",
        classification: "unknown_live_historical_review",
        knownInManifest: false,
        registeredInBrandCanon: false,
        listedAsHistorical: false,
      }]);
    });
  });
});
