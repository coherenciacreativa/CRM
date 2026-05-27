import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  buildApprovalPhrase,
  buildReport,
  candidateRowsFor,
  launchFrom,
  parseArgs,
  planLaunchGroups,
  renderMarkdown,
  slugify,
} from "../scripts/crm-vnext-mailerlite-mini-launch-group-dry-run.mjs";

const rehearsalPacket = {
  ok: true,
  status: "mini_launch_rehearsal_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  handoffs: {
    mailerLite: {
      candidates: {
        sourceGroupCandidate: {
          name: "CC · Source · Quiz · Inteligencia para descansar",
        },
        deliveredGroupCandidate: {
          name: "CC · Delivered · Quiz result · Inteligencia para descansar",
        },
      },
    },
  },
};

const seedTestQaPacket = {
  ok: true,
  status: "seed_test_qa_packet_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
};

const brandEmailAssetPacket = {
  ok: true,
  status: "brand_email_asset_packet_ready_for_brand_review_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
};

const eventContract = {
  ok: true,
  status: "mini_launch_event_contract_ready_no_ledger_write",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
};

const sourceFile = async (dir: string, name: string, data: unknown) => {
  const path = join(dir, name);
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return path;
};

const writeDictionary = async (dir: string, rows: string) => {
  const path = join(dir, "brand-dictionary.md");
  await writeFile(path, `
# Fixture

| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |
|---|---|---|---|---|---|
${rows}
`, "utf8");
  return path;
};

const withFixtureFiles = async <T>(rows: string, fn: (paths: Record<string, string>) => Promise<T>) => {
  const dir = await mkdtemp(join(tmpdir(), "mini-launch-group-dry-run-"));
  try {
    const paths = {
      rehearsalPacket: await sourceFile(dir, "rehearsal.json", rehearsalPacket),
      seedTestQaPacket: await sourceFile(dir, "seed.json", seedTestQaPacket),
      brandEmailAssetPacket: await sourceFile(dir, "brand-email.json", brandEmailAssetPacket),
      eventContract: await sourceFile(dir, "event.json", eventContract),
      brandDictionary: await writeDictionary(dir, rows),
    };
    return await fn(paths);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("CRM vNext MailerLite mini-launch group dry-run", () => {
  test("normalizes args and rejects unsafe API bases", () => {
    const parsed = parseArgs(["--timeout-ms", "5000"]);

    expect(parsed.timeoutMs).toBe(5000);
    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(() => parseArgs(["--api-base", "https://example.com/api"])).toThrow(/unsafe_api_base_not_mailerlite/);
  });

  test("extracts launch and candidate group names", () => {
    const launch = launchFrom(rehearsalPacket, seedTestQaPacket, brandEmailAssetPacket, eventContract);

    expect(launch).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      resourceType: "quiz",
      sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
    });
    expect(slugify(launch.resourceName)).toBe("inteligencia_para_descansar");
    expect(candidateRowsFor(launch).map((row) => row.recommendedStatus)).toEqual(["candidate", "candidate"]);
  });

  test("blocks groups missing from Brand dictionary and emits candidate rows", async () => {
    await withFixtureFiles("", async (paths) => {
      const report = await buildReport({
        ...parseArgs([]),
        ...paths,
      }, {
        generatedAt: "2026-05-27T00:00:00.000Z",
        liveGroupsOverride: [],
      });

      expect(report.status).toBe("blocked_until_brand_dictionary_candidates");
      expect(report.summary).toMatchObject({
        missingBrandCandidateCount: 2,
        safeEmptyCreateTargetCount: 0,
      });
      expect(report.proposedBrandDictionaryRows).toHaveLength(2);
      expect(report.readiness.canCreateNamedEmptyGroupsAfterExplicitApproval).toBe(false);
      expect(report.futureApprovalPhrase).toBeNull();
    });
  });

  test("candidate Brand status still blocks empty-group creation", async () => {
    await withFixtureFiles(`
| \`CC · Source · Quiz · Inteligencia para descansar\` | Source | \`candidate\` | Posible origen. | Cohorte futura. | \`source_type=quiz; source=inteligencia_para_descansar\` |
| \`CC · Delivered · Quiz result · Inteligencia para descansar\` | Delivered | \`candidate\` | Posible entrega. | Recibo futuro. | \`content.delivered=quiz_result_inteligencia_para_descansar\` |
`, async (paths) => {
      const report = await buildReport({
        ...parseArgs([]),
        ...paths,
      }, {
        generatedAt: "2026-05-27T00:00:00.000Z",
        liveGroupsOverride: [],
      });

      expect(report.status).toBe("blocked_until_brand_promotes_or_rejects_candidates");
      expect(report.summary.brandStatusBlockedCount).toBe(2);
      expect(report.plannedGroups.every((group) => group.emptyGroupCreationStatus === "blocked_brand_status_not_create_approved")).toBe(true);
    });
  });

  test("proposed_local missing groups become create-empty targets only after explicit future approval", async () => {
    await withFixtureFiles(`
| \`CC · Source · Quiz · Inteligencia para descansar\` | Source | \`proposed_local\` | Posible origen. | Cohorte futura. | \`source_type=quiz; source=inteligencia_para_descansar\` |
| \`CC · Delivered · Quiz result · Inteligencia para descansar\` | Delivered | \`proposed_local\` | Posible entrega. | Recibo futuro. | \`content.delivered=quiz_result_inteligencia_para_descansar\` |
`, async (paths) => {
      const report = await buildReport({
        ...parseArgs([]),
        ...paths,
      }, {
        generatedAt: "2026-05-27T00:00:00.000Z",
        liveGroupsOverride: [],
      });

      expect(report.status).toBe("mini_launch_group_dry_run_ready_for_future_empty_group_decision");
      expect(report.readiness.canCreateNamedEmptyGroupsAfterExplicitApproval).toBe(true);
      expect(report.approvalGate.canCreateGroups).toBe(false);
      expect(report.approvalGate.canAssignSubscribers).toBe(false);
      expect(report.plannedGroups.every((group) => group.workflowAttachmentAllowed === false)).toBe(true);
      expect(buildApprovalPhrase(report.plannedGroups)).toContain("sin subscribers");
    });
  });

  test("already-live proposed_local groups close the empty-create boundary", async () => {
    await withFixtureFiles(`
| \`CC · Source · Quiz · Inteligencia para descansar\` | Source | \`proposed_local\` | Posible origen. | Cohorte futura. | \`source_type=quiz; source=inteligencia_para_descansar\` |
| \`CC · Delivered · Quiz result · Inteligencia para descansar\` | Delivered | \`proposed_local\` | Posible entrega. | Recibo futuro. | \`content.delivered=quiz_result_inteligencia_para_descansar\` |
`, async (paths) => {
      const report = await buildReport({
        ...parseArgs([]),
        ...paths,
      }, {
        generatedAt: "2026-05-27T00:00:00.000Z",
        liveGroupsOverride: [
          { id: "source-group-id", name: "CC · Source · Quiz · Inteligencia para descansar" },
          { id: "delivered-group-id", name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
        ],
      });

      expect(report.status).toBe("mini_launch_groups_already_exist_no_create_needed");
      expect(report.summary.groupsAlreadyLiveCount).toBe(2);
      expect(report.summary.safeEmptyCreateTargetCount).toBe(0);
      expect(report.readiness.canCreateNamedEmptyGroupsAfterExplicitApproval).toBe(false);
      expect(report.readiness.nextNoLiveMove).toContain("no empty-group creation approval is needed");
      expect(report.futureApprovalPhrase).toBeNull();
    });
  });

  test("rendered report keeps live actions closed", async () => {
    await withFixtureFiles("", async (paths) => {
      const report = await buildReport({
        ...parseArgs([]),
        ...paths,
      }, {
        generatedAt: "2026-05-27T00:00:00.000Z",
        liveGroupsOverride: [],
      });
      const markdown = renderMarkdown(report);

      expect(markdown).toContain("Mini-Launch Group Dry-Run");
      expect(markdown).toContain("Proposed Brand Dictionary Candidate Rows");
      expect(markdown).toContain("No approval phrase available yet");
      expect(markdown).toContain("No subscribers read or printed");
    });
  });
});
