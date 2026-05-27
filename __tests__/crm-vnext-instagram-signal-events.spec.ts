import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';
import {
  buildCrmVNextInstagramSignalEvents,
} from '../lib/crm/crm-vnext-instagram-signal-events.js';
import { buildCrmVNextSignalEventPipeline } from '../lib/crm/crm-vnext-signal-event-pipeline';
import { CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION } from '../lib/crm/crm-vnext-card-write-apply';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext';

const execFileAsync = promisify(execFile);
const NOW = '2026-05-21T12:00:00.000Z';

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-ig-signals-'));
  dirs.push(dir);
  return dir;
};

const writeCardStore = async () => {
  const dir = await tempDir();
  const cardStorePath = join(dir, 'person-cards-vnext.json');
  const card = buildPersonCardVNext({
    personId: 'ig:cielo_gom_g',
    displayName: 'Cielo Gómez',
    now: NOW,
    identities: {
      instagramHandle: 'cielo_gom_g',
      email: 'cielotago@gmail.com',
    },
  });
  await writeFile(cardStorePath, JSON.stringify({
    schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
    generatedAt: NOW,
    base: null,
    cards: [card],
  }, null, 2));
  return cardStorePath;
};

describe('CRM vNext Instagram signal events', () => {
  test('converts supplied Instagram observations into canonical signal events', () => {
    const report = buildCrmVNextInstagramSignalEvents({
      observations: [
        {
          sourceKind: 'instagram_messages_ui',
          eventKind: 'story_view',
          instagramHandle: '@cielo_gom_g',
          observedAt: '2026-05-20T10:00:00.000Z',
          quantity: 4,
          confidence: 'strong',
          summary: 'Cielo aparece viendo stories con frecuencia; observación read-only.',
          sourceId: '/Users/alejandrogomez/private/ig/cielo.json',
        },
        {
          sourceKind: 'instagram_api_future',
          eventKind: 'engagement_snapshot',
          instagramHandle: 'cielo_gom_g',
          observedAt: '2026-05-21T09:00:00.000Z',
          metrics: {
            storyViews30d: 12,
            likes30d: 3,
            inboundDm30d: 1,
            lastInteractionAt: '2026-05-21T08:00:00.000Z',
          },
        },
      ],
    }, { now: NOW });

    expect(report.schemaVersion).toBe('crm-vnext-instagram-signal-events-2026-05-21');
    expect(report.summary).toMatchObject({
      observationsRead: 2,
      eventsGenerated: 2,
      skippedRecords: 0,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(report.signalEvents[0]).toMatchObject({
      sourceKind: 'instagram_messages_ui',
      eventKind: 'instagram_story_view',
      channel: 'instagram',
      instagramHandle: 'cielo_gom_g',
      quantity: 4,
      confidence: 'strong',
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
    expect(report.safety.liveApiCallsProhibited).toBe(true);
  });

  test('normalizes real Instagram surfaces without creating a parallel scoring lane', () => {
    const report = buildCrmVNextInstagramSignalEvents({
      observations: [
        {
          sourceKind: 'instagram_webhook',
          eventKind: 'story_reply',
          instagramHandle: 'cadavid_eli',
          observedAt: '2026-05-21T08:30:00.000Z',
          summary: 'Story reply visible through read-only webhook/UI packet.',
        },
        {
          sourceKind: 'instagram_webhook',
          eventKind: 'message_reaction',
          instagramHandle: 'cadavid_eli',
          observedAt: '2026-05-21T08:40:00.000Z',
          summary: 'Reaction to an existing message; no outbound action.',
        },
        {
          sourceKind: 'instagram_api',
          eventKind: 'media_insight',
          instagramHandle: 'cadavid_eli',
          observedAt: '2026-05-21T09:00:00.000Z',
          metrics: {
            profileVisits30d: 4,
            reach30d: 120,
            shares30d: 2,
          },
          summary: 'Aggregate media/account insight attached to a known card for dry-run testing.',
        },
      ],
    }, { now: NOW });

    expect(report.summary).toMatchObject({
      observationsRead: 3,
      eventsGenerated: 3,
      skippedRecords: 0,
    });
    expect(report.signalEvents[0]).toMatchObject({
      eventKind: 'instagram_dm',
      tags: expect.arrayContaining(['instagram_surface:story_reply']),
    });
    expect(report.signalEvents[1]).toMatchObject({
      eventKind: 'instagram_dm',
      tags: expect.arrayContaining(['instagram_surface:message_reaction']),
    });
    expect(report.signalEvents[2]).toMatchObject({
      eventKind: 'instagram_engagement_snapshot',
      metrics: expect.objectContaining({
        profileVisits30d: 4,
        reach30d: 120,
        shares30d: 2,
      }),
      tags: expect.arrayContaining(['instagram_surface:aggregate_insight']),
    });
  });

  test('feeds Instagram events into the shared signal event pipeline', async () => {
    const cardStorePath = await writeCardStore();
    const instagramEvents = buildCrmVNextInstagramSignalEvents({
      observations: [
        {
          sourceKind: 'instagram_messages_ui',
          kind: 'dm',
          instagramHandle: 'cielo_gom_g',
          observedAt: '2026-05-20T10:00:00.000Z',
          summary: 'Intercambio de DM sobre retiro anterior; cuerpo completo no exportado.',
        },
        {
          sourceKind: 'instagram_api',
          kind: 'story_view',
          instagramHandle: 'cielo_gom_g',
          observedAt: '2026-05-21T10:00:00.000Z',
          quantity: 2,
        },
      ],
    }, { now: NOW });

    const pipeline = await buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      sources: [
        {
          kind: 'signal_events',
          payload: instagramEvents,
        },
      ],
    });

    expect(pipeline.summary).toMatchObject({
      sourceEvents: 2,
      normalizedEvents: 2,
      projectedSignals: 2,
      cardsPreviewed: 1,
      unmatchedSignals: 0,
    });
    expect(pipeline.projection.summary).toMatchObject({
      bySourceKind: {
        instagram_activity: 2,
      },
    });
    expect(pipeline.engagementPreview.previewItems[0].aggregatedSignals.instagram).toMatchObject({
      inboundDm30d: 1,
      storyViews30d: 2,
    });
  });

  test('CLI writes a safe read-only report and skips unanchored observations', async () => {
    const dir = await tempDir();
    const observationsPath = join(dir, 'observations.json');
    const outPath = join(dir, 'instagram-events.json');
    await writeFile(observationsPath, JSON.stringify({
      observations: [
        {
          sourceKind: 'instagram_ui',
          type: 'comment',
          instagramHandle: 'cadavid_eli',
          observedAt: NOW,
          summary: 'Comentó una publicación reciente.',
        },
        {
          sourceKind: 'instagram_ui',
          type: 'like',
          observedAt: NOW,
          summary: 'Sin handle no debe entrar al ledger.',
        },
      ],
    }, null, 2));

    await execFileAsync('node', [
      'scripts/crm-vnext-instagram-signal-events.mjs',
      '--observations-file',
      observationsPath,
      '--out',
      outPath,
    ], { cwd: process.cwd() });

    const report = JSON.parse(await readFile(outPath, 'utf8'));
    expect(report.summary).toMatchObject({
      observationsRead: 2,
      eventsGenerated: 1,
      skippedRecords: 1,
    });
    expect(report.events[0]).toMatchObject({
      eventKind: 'instagram_comment',
      instagramHandle: 'cadavid_eli',
    });
  });
});
