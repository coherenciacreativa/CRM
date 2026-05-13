import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import {
  buildCrmVNextDeepLocalStitching,
  normalizeCrmVNextConnectedEvidenceSources,
} from "../lib/crm/crm-vnext-deep-local-stitching.js";

const execFileAsync = promisify(execFile);

describe("CRM vNext Instagram DM UI evidence script", () => {
  test("converts an email search observation into a bridge evidence source", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-ig-dm-ui-"));
    try {
      const observationsPath = join(dir, "observations.json");
      const outPath = join(dir, "ig-dm-ui-evidence.json");
      await writeFile(observationsPath, JSON.stringify({
        observations: [
          {
            searchTerm: "r_mart803@hotmail.com",
            subjectName: "Rocío Martínez Jaime",
            subjectEmail: "r_mart803@hotmail.com",
            matchedInstagramHandle: "rocio_yoga_mx",
            matchedDisplayName: "Rocío Martínez Jaime",
            observedBy: "Alejandro",
            observedAt: "2026-05-14T12:00:00.000Z",
            confidence: "strong",
            snippet: "El correo aparecio en la busqueda interna de mensajes de Instagram.",
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-instagram-dm-ui-evidence.mjs",
        "--observations-file",
        observationsPath,
        "--out",
        outPath,
      ], { cwd: process.cwd() });

      const report = JSON.parse(await readFile(outPath, "utf8"));
      expect(report.mode).toBe("read_only_instagram_dm_ui_evidence");
      expect(report.summary).toMatchObject({
        observationsRead: 1,
        bridgeEvidenceSources: 1,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(report.evidenceSources[0]).toMatchObject({
        sourceKind: "instagram_dm_ui_export",
        email: "r_mart803@hotmail.com",
        handle: "rocio_yoga_mx",
      });
      expect(report.evidenceSources[0].text).toContain("Instagram: @rocio_yoga_mx");
      expect(JSON.stringify(report)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("feeds Instagram DM UI bridge evidence into deep local stitching", async () => {
    const connectedSources = normalizeCrmVNextConnectedEvidenceSources([
      {
        sourceKind: "instagram_dm_ui_export",
        sourceId: "instagram-dm-ui:rocio",
        title: "Instagram DM UI bridge: r_mart803@hotmail.com -> @maryamtzj",
        subject: "Rocío Martínez Jaime",
        email: "r_mart803@hotmail.com",
        handle: "maryamtzj",
        observedAt: "2026-05-14T12:00:00.000Z",
        text: [
          "Source: Instagram DM UI search bridge",
          "Search term: r_mart803@hotmail.com",
          "Email: r_mart803@hotmail.com",
          "Name: Rocío Martínez Jaime",
          "Thread display name: Mart Marya",
          "Instagram: @maryamtzj.",
          "Handle: @maryamtzj.",
          "Review note: read-only UI observation; no outbound message sent.",
        ].join("\n"),
      },
    ]);

    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: Rocío Martínez Jaime tiene email r_mart803@hotmail.com y queremos encontrar su Instagram.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: "2026-05-14T12:00:00.000Z",
      cards: [],
      mailerBridgeRows: [],
      localSources: connectedSources,
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: connectedSources.length },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].identitySummary).toMatchObject({
      emails: ["r_mart803@hotmail.com"],
      instagramHandles: ["maryamtzj"],
    });
    expect(report.clues[0].hits[0].contextSignals).toEqual(expect.arrayContaining([
      "instagram_dm_ui_bridge_context",
      "lead_capture_context",
    ]));
    expect(report.clues[0].identitySummary.sourceKindsWithIdentitySignals).toMatchObject({
      instagram_dm_ui_export: 1,
    });
  });
});
