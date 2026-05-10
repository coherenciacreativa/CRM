import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildCrmVNextDeepLocalStitching,
  loadCrmVNextDeepLocalSources,
  normalizeCrmVNextConnectedEvidenceSources,
} from "../lib/crm/crm-vnext-deep-local-stitching.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext deep local stitching", () => {
  test("defers new-card creation when local memory has contextual evidence", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "memory:chats/telegram-group-5162126138/topics/crm-coordination-juana/WORKLOG.md",
          sourceKind: "telegram_chat_memory",
          text: [
            "- 2026-03-10T15:58:00-05:00 [lead-status-mayerli-no-asiste][Juana]",
            "  - Juana reporta que Mayerli y su esposo no podrán asistir al retiro por cruce con otro evento. Archivo /Users/alejandro/private-note.md",
          ].join("\n"),
        },
      ],
      sourceCoverage: { filesScanned: 1, filesSkipped: 0, roots: 1 },
    });

    expect(report.mode).toBe("read_only_deep_local_stitching");
    expect(report.summary).toMatchObject({
      clues: 1,
      cluesWithHits: 1,
      newCardCreationsDeferred: 1,
      newCardCreationsNotBlocked: 0,
      sourcesWithHits: 1,
    });

    const clue = report.clues[0];
    expect(clue.identityResearchRecommendation).toBe("create_new_card_candidate");
    expect(clue.recommendation.action).toBe("defer_new_card_creation");
    expect(clue.hits[0]).toMatchObject({
      sourceKind: "telegram_chat_memory",
      confidence: "strong",
      evidenceUse: "identity_stitching_context_only",
    });
    expect(clue.hits[0].contextSignals).toEqual(expect.arrayContaining([
      "supports_retreat_context",
      "supports_family_context",
      "human_assistant_report_context",
    ]));
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("does not block new-card creation when safe local memory has no hits", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @ana_nueva es Ana, estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "memory:chats/example/WORKLOG.md",
          sourceKind: "telegram_chat_memory",
          text: "No mention of the target person here.",
        },
      ],
      sourceCoverage: { filesScanned: 1, filesSkipped: 0, roots: 1 },
    });

    expect(report.summary.cluesWithHits).toBe(0);
    expect(report.summary.newCardCreationsDeferred).toBe(0);
    expect(report.summary.newCardCreationsNotBlocked).toBe(1);
    expect(report.clues[0].recommendation.action).toBe("new_card_creation_not_blocked_by_deep_search");
    expect(report.safety.localPathsRedacted).toBe(true);
  });

  test("loads contacts exports and retreat tables as read-only stitching evidence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-expanded-evidence-"));
    try {
      const downloads = join(dir, "Downloads");
      await mkdir(downloads, { recursive: true });
      await writeFile(
        join(downloads, "contacts.csv"),
        [
          "First Name,Last Name,Email,Phone 1,Labels,Notas",
          "Mayerli,,mayerli@example.com,+570000000000,Yoga; Retiros,Asiste con su familia",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        join(downloads, "81274494720_RegistrationReport.csv"),
        [
          "First Name,Last Name,Email,Approval Status",
          "Mayerli,Ramirez,mayerli@example.com,approved",
        ].join("\n"),
        "utf8",
      );

      const localSourceLoad = await loadCrmVNextDeepLocalSources([
        {
          root: downloads,
          sourceKind: "downloaded_file",
          sourceIdPrefix: "downloads",
        },
      ]);

      expect(localSourceLoad.sources.map((source) => source.sourceKind)).toEqual(expect.arrayContaining([
        "contacts_export",
        "retreat_table",
      ]));

      const report = buildCrmVNextDeepLocalStitching({
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        now: NOW,
        cards: [],
        mailerBridgeRows: [],
        localSources: localSourceLoad.sources,
        sourceCoverage: localSourceLoad,
      });

      expect(report.summary.newCardCreationsDeferred).toBe(1);
      expect(report.sourceCoverage.localSources.sourceKinds).toMatchObject({
        contacts_export: 1,
        retreat_table: 1,
      });
      expect(report.clues[0].hits.map((hit) => hit.sourceKind)).toEqual(expect.arrayContaining([
        "contacts_export",
        "retreat_table",
      ]));
      expect(report.clues[0].hits.flatMap((hit) => hit.contextSignals)).toEqual(expect.arrayContaining([
        "contact_registry_context",
        "retreat_attendee_table_context",
      ]));
      expect(JSON.stringify(report)).not.toContain(dir);
      expect(JSON.stringify(report)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("normalizes Gmail and contacts evidence packets without leaking local paths", () => {
    const connectedSources = normalizeCrmVNextConnectedEvidenceSources([
      {
        sourceKind: "gmail_export",
        sourceId: "gmail:thread:mayerli",
        subject: "Retiro y clases de yoga",
        sender: "Mayerli <mayerli@example.com>",
        snippet: "Mayerli pregunta por el retiro y confirma interes en las clases de yoga. Archivo /Users/alejandro/mail.txt",
      },
      {
        sourceKind: "contacts_app_export",
        sourceId: "/Users/alejandro/Contacts/Mayerli.contact",
        title: "Mayerli",
        email: "mayerli@example.com",
        handle: "@mayuyis2626",
        text: "Contacto de comunidad, yoga y retiros.",
      },
    ]);

    expect(connectedSources).toHaveLength(2);
    expect(connectedSources.map((source) => source.sourceKind)).toEqual([
      "gmail_export",
      "contacts_app_export",
    ]);
    expect(JSON.stringify(connectedSources)).not.toContain("/Users/");

    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: connectedSources,
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: connectedSources.length },
    });

    expect(report.summary.newCardCreationsDeferred).toBe(1);
    expect(report.sourceCoverage.localSources.connectedEvidenceSources).toBe(2);
    expect(report.sourceCoverage.localSources.sourceKinds).toMatchObject({
      gmail_export: 1,
      contacts_app_export: 1,
    });
    expect(report.clues[0].hits.flatMap((hit) => hit.contextSignals)).toEqual(expect.arrayContaining([
      "email_thread_context",
      "contact_registry_context",
    ]));
    expect(JSON.stringify(report)).not.toContain("/Users/");
  });

  test("keeps diverse identity evidence when memory hits would otherwise crowd it out", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "memory:crm/one.md",
          sourceKind: "telegram_chat_memory",
          text: [
            "Juana reporta que Mayerli y su esposo no podrán asistir al retiro por cruce con otro evento.",
            "Mayerli aparece en seguimiento de retiro familiar.",
            "Mayerli confirma contexto de yoga y familia.",
          ].join("\n"),
        },
        {
          sourceId: "memory:crm/two.md",
          sourceKind: "crm_memory_fabric",
          text: "Mayerli tiene historia previa con retiros, yoga y familia.",
        },
        {
          sourceId: "downloads:GMT20260122-231445_RecordingnewChat.txt",
          sourceKind: "downloaded_file",
          text: "00:53:47 Gladys Mayerli Garcia Ortegon: Yo. Gracias Alejito",
        },
      ],
      sourceCoverage: { filesScanned: 3, filesSkipped: 0, roots: 2 },
    });

    const hits = report.clues[0].hits;
    const downloadedHit = hits.find((hit) => hit.sourceKind === "downloaded_file");
    expect(downloadedHit).toBeTruthy();
    expect(downloadedHit?.identitySignals.fullNameCandidates).toContain("Gladys Mayerli Garcia Ortegon");
    expect(downloadedHit?.contextSignals).toContain("identity_field_context");
    expect(report.clues[0].identitySummary).toMatchObject({
      fullNameCandidates: ["Gladys Mayerli Garcia Ortegon"],
      instagramHandles: ["mayuyis2626"],
      missingContactFields: ["email", "phone"],
    });
    expect(report.clues[0].identitySummary.sourceKindsWithIdentitySignals).toMatchObject({
      downloaded_file: 1,
    });
  });

  test("uses conservative surname aliases when searching connected evidence", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace más de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "google-drive:seminario-2014:row-amalia",
          sourceKind: "google_drive_export",
          text: "Name: Amalia De Bedout Email: amaliadbg@hotmail.com Context: Estudiantes; Asistentes a retiros; yoga.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].hits[0].matchedIdentityTerms).toContain("name_alias:bedud->bedout");
    expect(report.clues[0].identitySummary).toMatchObject({
      fullNameCandidates: ["Amalia De Bedout"],
      emails: ["amaliadbg@hotmail.com"],
    });
  });

  test("does not borrow unrelated handles from multi-person evidence lines", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace más de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "memory:daily/current-students.md",
          sourceKind: "daily_memory",
          text: [
            "2026-05-10 Amalia de Bedud es estudiante mía hace más de 10 años, phone pendiente, y ella sí tiene Instagram.",
            "@cadavid_eli se llama Eliana, asiste a mis clases de yoga y vive en Medellín.",
          ].join(" "),
        },
      ],
      sourceCoverage: { filesScanned: 1, filesSkipped: 0, roots: 1 },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].identitySummary.instagramHandles).toEqual([]);
    expect(report.clues[0].identitySummary.phones).toEqual([]);
    expect(report.clues[0].hits.flatMap((hit) => hit.identitySignals.instagramHandles)).toEqual([]);
  });

  test("does not extract emails from structured rows owned by another person", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace más de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "contacts:natalia:1",
          sourceKind: "contacts_app_export",
          text: "Name: Natalia Cardenas De Bedout Email: natis1000@hotmail.com Email: ncardenadb@gmail.com Context: daughter of Amalia, yoga and retreats",
        },
        {
          sourceId: "gmail:amalia:1",
          sourceKind: "gmail_export",
          text: "From: Amalia De Bedout <amaliadbg@hotmail.com> Subject: Yoga y retiros",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 2 },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].identitySummary.fullNameCandidates).toEqual(["Amalia De Bedout"]);
    expect(report.clues[0].identitySummary.emails).toEqual(["amaliadbg@hotmail.com"]);
    expect(report.clues[0].hits.find((hit) => hit.sourceId === "contacts:natalia:1")?.identitySignals.emails).toEqual([]);
  });

  test("does not promote explicitly ambiguous rows into identity fields", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @cadavid_eli se llama Eliana, asiste a mis clases de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "google-drive:retiros-2023:eliana-ambiguous",
          sourceKind: "google_drive_export",
          text: "Name: Eliana Ortegon Palacios. This row is ambiguous and not assigned to @cadavid_eli without more evidence.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].identitySummary.fullNameCandidates).toEqual([]);
    expect(report.clues[0].hits[0].identitySignals.fullNameCandidates).toEqual([]);
  });

  test("extracts only labeled phone values from lead-capture evidence", () => {
    const report = buildCrmVNextDeepLocalStitching({
      text: "CRM: @cadavid_eli se llama Eliana, asiste a mis clases de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      maxHitsPerClue: 3,
      localSources: [
        {
          sourceId: "lead-capture:crm_webhook:eliana",
          sourceKind: "lead_capture_export",
          text: "Source: crm_webhook Contact ID: 1869907027 Name: Eliana Cadavid Instagram: @cadavid_eli Email: eli.cadavid@hotmail.com Phone: 3104954266 Notes: range 2026-02-17 to 2026-02-27.",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
    });

    expect(report.summary.cluesWithHits).toBe(1);
    expect(report.clues[0].identitySummary.phones).toEqual(["3104954266"]);
    expect(report.clues[0].identitySummary.phones).not.toContain("1869907027");
    expect(report.clues[0].identitySummary.phones).not.toContain("20260217");
  });
});
