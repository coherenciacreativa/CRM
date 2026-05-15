import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext human enrichment response evidence script", () => {
  test("turns compact freestyle answers into evidence sources and operator tasks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-human-response-"));
    try {
      const answersPath = join(dir, "answers.md");
      const questionsPath = join(dir, "questions.json");
      const outPath = join(dir, "evidence.json");
      const markdownPath = join(dir, "summary.md");

      await writeFile(answersPath, [
        "# CRM vNext - Revision Compacta Para Alejandro",
        "",
        "## 1. @angiemontero16",
        "",
        "Respuesta libre:",
        "> Esta persona es prima de un amigo muy cercano que se llama Jorge Luis Lázaro. Ve las stories con frecuencia. Es abogada, vive en Bogotá, Colombia. Vía el primo podríamos conseguir el email.",
        "",
        "## 2. Ana Ch (@anachbrown)",
        "",
        "Respuesta libre:",
        "> Veo que en instagram siguió el flujo oficial manychat y nos dio email. Vale la pena revisar mensajes de IG, registros de manychat, vercel o mailer.",
        "",
        "## 3. Edwin Velasquez",
        "",
        "Respuesta libre:",
        "> nada que agregar, no lo conozco",
      ].join("\n"), "utf8");

      await writeFile(questionsPath, JSON.stringify({
        questions: [
          {
            personId: "ig:angiemontero16",
            subject: {
              label: "@angiemontero16",
              displayName: null,
              instagramHandle: "angiemontero16",
            },
            known: { identity: ["Instagram: @angiemontero16"] },
          },
          {
            personId: "ig:anachbrown",
            subject: {
              label: "Ana Ch (@anachbrown)",
              displayName: "Ana Ch",
              instagramHandle: "anachbrown",
            },
            known: { identity: ["Nombre: Ana Ch", "Instagram: @anachbrown"] },
          },
          {
            personId: "email:edwin@example.com",
            subject: {
              label: "Edwin Velasquez",
              displayName: "Edwin Velasquez",
              instagramHandle: null,
            },
            known: { identity: ["Nombre: Edwin Velasquez", "Email: edwin@example.com"] },
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-human-enrichment-response-evidence.mjs",
        "--answers-md",
        answersPath,
        "--questions-file",
        questionsPath,
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");

      expect(packet.summary).toMatchObject({
        sectionsRead: 3,
        answersFound: 3,
        evidenceSources: 3,
        operatorTasks: 2,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.evidenceSources[0]).toMatchObject({
        sourceKind: "human_enrichment_response",
        handle: "angiemontero16",
      });
      expect(packet.evidenceSources[0].text).toContain("Finding: Relacion: es prima de Jorge Luis Lazaro");
      expect(packet.evidenceSources[0].text).toContain("Finding: Ciudad/pais: vive en Bogota, Colombia.");
      expect(packet.operatorTasks.map((task: { taskKind: string }) => task.taskKind)).toEqual(
        expect.arrayContaining(["identity_follow_up", "source_investigation"]),
      );
      expect(markdown).toContain("Human Enrichment Response Evidence");
      expect(JSON.stringify(packet)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
