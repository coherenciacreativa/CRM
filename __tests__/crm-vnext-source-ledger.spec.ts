import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmVNextSourceLedger } from "../lib/crm/crm-vnext-source-ledger.js";

const NOW = "2026-05-09T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const makeSourceFiles = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-source-ledger-"));
  dirs.push(dir);

  const paths = {
    personCards: join(dir, "person-cards-v1.json"),
    mailerSnapshot: join(dir, "mailer-engagement-snapshot.json"),
    mailerBridge: join(dir, "mailer-ig-bridge.csv"),
    skippedMailerRows: join(dir, "person-cards-v1-skipped-mailer-rows.json"),
    igUiSignals: join(dir, "ig-ui-signals-state.json"),
    igApiInbox: join(dir, "ig-api-inbox-snapshot.json"),
    igWebProbe: join(dir, "ig-web-probe-state.json"),
    factStore: join(dir, "facts.jsonl"),
  };

  await writeFile(paths.personCards, JSON.stringify({
    generatedAt: "2026-05-08T00:00:00.000Z",
    counts: { emailPresent: 630, instagramPresent: 103, omnichannel: 5 },
    cards: Array.from({ length: 728 }, (_, index) => ({ personId: `email:test${index}@example.com` })),
  }), "utf8");
  await writeFile(paths.mailerSnapshot, JSON.stringify({
    generatedAt: "2026-04-06T00:00:00.000Z",
    source: "mailerlite:contacts.csv",
    profiles: Array.from({ length: 631 }, (_, index) => ({ email: `test${index}@example.com`, opens30d: 0, clicks30d: 0 })),
  }), "utf8");
  await writeFile(paths.mailerBridge, "email,igHandle\na@example.com,a_handle\nb@example.com,b_handle\n", "utf8");
  await writeFile(paths.skippedMailerRows, JSON.stringify({
    generatedAt: "2026-05-08T00:00:00.000Z",
    rows: [{}],
  }), "utf8");
  await writeFile(paths.igUiSignals, JSON.stringify({
    generatedAt: "2026-05-09T00:00:00.000Z",
    metrics: { likedYourReel: { notifications: 2 }, startedFollowing: { notifications: 1 } },
  }), "utf8");
  await writeFile(paths.igApiInbox, JSON.stringify({
    generatedAt: "2026-05-08T00:00:00.000Z",
    status: "blocked",
    health: "red",
    conversation_count: 0,
    ready_read: false,
    ready_send: true,
  }), "utf8");
  await writeFile(paths.igWebProbe, JSON.stringify({
    generatedAt: "2026-03-19T00:00:00.000Z",
    status: "stale",
    health: "red",
  }), "utf8");

  return { dir, paths };
};

describe("CRM vNext source ledger", () => {
  test("summarizes local source health without leaking paths", async () => {
    const { dir, paths } = await makeSourceFiles();

    const ledger = await buildCrmVNextSourceLedger({
      now: NOW,
      expectedMailerLiteContacts: 1000,
      paths,
    });

    expect(ledger.mode).toBe("read_only_source_ledger");
    expect(ledger.status).toBe("watch");
    expect(ledger.safety.credentialReadProhibited).toBe(true);
    expect(ledger.sources.map((source) => source.id)).toContain("fact_intake_protocol");
    expect(ledger.sources.map((source) => source.id)).toContain("fact_store");

    const personCards = ledger.sources.find((source) => source.id === "person_cards_v1");
    expect(personCards?.recordCount).toBe(728);
    expect(personCards?.metrics.emailPresent).toBe(630);

    const mailer = ledger.sources.find((source) => source.id === "mailerlite_engagement_snapshot");
    expect(mailer?.recordCount).toBe(631);
    expect(mailer?.freshness).toBe("stale");
    expect(mailer?.metrics.missingFromExpected).toBe(369);

    expect(ledger.gaps.map((gap) => gap.id)).toEqual(expect.arrayContaining([
      "mailerlite_expected_coverage_gap",
      "mailerlite_snapshot_stale",
      "instagram_api_read_blocked",
      "instagram_web_probe_unreliable",
    ]));
    expect(JSON.stringify(ledger)).not.toContain(dir);
  });
});
