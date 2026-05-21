import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  buildCrmVNextControlRoom,
} from '../lib/crm/crm-vnext-control-room';
import {
  formatCrmVNextControlRoomMarkdown,
} from '../lib/crm/crm-vnext-control-room-markdown';
import { CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION } from '../lib/crm/crm-vnext-card-write-apply';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext';

const NOW = '2026-05-22T12:00:00.000Z';
let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-control-room-'));
  dirs.push(dir);
  return dir;
};

const writeCardStore = async (dir: string) => {
  const cardStorePath = join(dir, 'person-cards-vnext.json');
  const card = buildPersonCardVNext({
    personId: 'ig:cielo_gom_g',
    displayName: 'Cielo Gómez',
    now: NOW,
    identities: {
      instagramHandle: 'cielo_gom_g',
      email: 'cielotago@gmail.com',
      city: 'Bogotá',
      country: 'Colombia',
    },
  });
  await writeFile(cardStorePath, `${JSON.stringify({
    schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
    generatedAt: NOW,
    base: null,
    cards: [card],
  }, null, 2)}\n`);
  return cardStorePath;
};

describe('CRM vNext Control Room', () => {
  test('summarizes readiness, signal delta, and operator plan without leaking paths', async () => {
    const dir = await tempDir();
    const reportsDir = join(dir, 'reports');
    await writeFile(join(dir, 'empty-ledger.jsonl'), '');
    const cardStorePath = await writeCardStore(dir);
    await mkdir(reportsDir, { recursive: true });
    await writeFile(join(reportsDir, 'crm_vnext_instagram_signal_events_2026-05-22.json'), `${JSON.stringify({
      schemaVersion: 'crm-vnext-instagram-signal-events-2026-05-21',
      mode: 'read_only_instagram_signal_events',
      generatedAt: NOW,
      events: [
        {
          eventKind: 'instagram_story_view',
          sourceKind: 'instagram_messages_ui',
          observedAt: NOW,
          instagramHandle: 'cielo_gom_g',
        },
      ],
    }, null, 2)}\n`);

    const report = await buildCrmVNextControlRoom({
      now: NOW,
      cardStorePath,
      reportsDir,
      ledgerPath: join(dir, 'empty-ledger.jsonl'),
      signalSinceDays: 14,
      includeResolutionLoop: false,
      sourceLedgerPaths: {
        personCards: join(dir, 'missing-person-cards-v1.json'),
        mailerSnapshot: join(dir, 'missing-mailer.json'),
        mailerBridge: join(dir, 'missing-bridge.csv'),
        skippedMailerRows: join(dir, 'missing-skipped.json'),
        igUiSignals: join(dir, 'missing-ig-ui.json'),
        igApiInbox: join(dir, 'missing-ig-api.json'),
        igWebProbe: join(dir, 'missing-ig-web.json'),
        factStore: join(dir, 'missing-facts.jsonl'),
      },
    });
    const markdown = formatCrmVNextControlRoomMarkdown(report);

    expect(report.schemaVersion).toBe('crm-vnext-control-room-2026-05-22');
    expect(report.mode).toBe('read_only_control_room');
    expect(report.state).toBe('process_signal_delta');
    expect(report.summary).toMatchObject({
      cards: 1,
      emailCoveragePct: 100,
      instagramCoveragePct: 100,
      signalCandidatePackets: 1,
      operationsExecuted: 0,
    });
    expect(report.signalRouter.candidatePackets[0]).toMatchObject({
      fileName: 'crm_vnext_instagram_signal_events_2026-05-22.json',
      pipelineFlag: '--events-file',
    });
    expect(report.productDiscipline.whatNotToBuildNext).toContain('Do not wire outbound actions from warmth movement.');
    expect(markdown).toContain('# CRM vNext - Control Room');
    expect(markdown).toContain('Process Signal Delta');
    expect(JSON.stringify(report)).not.toContain('/Users/');
    expect(JSON.stringify(report)).not.toContain(dir);
  });
});
