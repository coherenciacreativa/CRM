import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { buildCrmVNextSignalEventPipeline } from '../lib/crm/crm-vnext-signal-event-pipeline';
import { CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION } from '../lib/crm/crm-vnext-card-write-apply';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext';

const NOW = '2026-05-21T12:00:00.000Z';

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-signal-pipeline-'));
  dirs.push(dir);
  return dir;
};

const writeCardStore = async (cards: unknown[]) => {
  const dir = await tempDir();
  const cardStorePath = join(dir, 'person-cards-vnext.json');
  await writeFile(cardStorePath, JSON.stringify({
    schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
    generatedAt: NOW,
    base: null,
    cards,
  }, null, 2));
  return { dir, cardStorePath };
};

const anaCard = () => buildPersonCardVNext({
  personId: 'email:ana@example.com',
  displayName: 'Ana Example',
  now: NOW,
  identities: { email: 'ana@example.com' },
  channels: { emailStatus: 'active' },
  evidence: [{ source: 'existing-card', observedAt: NOW }],
});

describe('CRM vNext signal event pipeline', () => {
  test('normalizes supplied MailerLite snapshots through events, projection, and preview without writes', async () => {
    const { cardStorePath } = await writeCardStore([anaCard()]);

    const report = await buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      sources: [
        {
          kind: 'mailerlite_snapshot',
          payload: {
            records: [
              {
                targetPersonId: 'email:ana@example.com',
                email: 'ana@example.com',
                subscriberStatus: 'active',
                opens30d: 3,
                clicks30d: 1,
                lastOpenAt: '2026-05-20T10:00:00.000Z',
                groups: ['Newsletter', 'Estudiantes'],
              },
            ],
          },
        },
      ],
    });

    expect(report.mode).toBe('read_only_signal_event_pipeline');
    expect(report.summary).toMatchObject({
      sourcesRead: 1,
      sourceSignals: 1,
      normalizedEvents: 1,
      eventsCommitted: false,
      projectedSignals: 1,
      cardsPreviewed: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(report.signalEventLedger.added).toBe(1);
    expect(report.engagementPreview.previewItems[0]).toMatchObject({
      personId: 'email:ana@example.com',
      match: { matchedBy: 'personId' },
      aggregatedSignals: {
        email: { lastOpenAt: '2026-05-20T10:00:00.000Z' },
      },
      operationsExecuted: 0,
    });
    expect(report.safety.liveApiCallsProhibited).toBe(true);
  });

  test('can commit local signal events and engagement snapshots with explicit approval', async () => {
    const { dir, cardStorePath } = await writeCardStore([anaCard()]);
    const ledgerPath = join(dir, 'signal-events.jsonl');
    const snapshotLedgerPath = join(dir, 'engagement-snapshots.jsonl');

    const report = await buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      ledgerPath,
      snapshotLedgerPath,
      approvedBy: 'Alejandro',
      writeEvents: true,
      writeSnapshot: true,
      sourceLabel: 'Approved test batch',
      sources: [
        {
          kind: 'gmail_reply_discovery',
          payload: {
            representativeExamples: [
              {
                messageId: 'gmail-1',
                from: { email: 'ana@example.com', name: 'Ana Example' },
                subject: 'Re: Newsletter',
                observedAt: '2026-05-20T10:00:00.000Z',
                candidateType: 'human_reply_candidate',
                replyConfidence: 'strong',
                reasonCodes: ['human_sender', 'reply_subject_prefix'],
              },
            ],
          },
        },
      ],
    });

    expect(report.summary).toMatchObject({
      eventsCommitted: true,
      eventsAdded: 1,
      snapshotCommitted: true,
      snapshotsAdded: 1,
    });
    expect(await readFile(ledgerPath, 'utf8')).toContain('email_reply');
    expect(await readFile(snapshotLedgerPath, 'utf8')).toContain('engagement_snapshot');

    const duplicate = await buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      ledgerPath,
      snapshotLedgerPath,
      approvedBy: 'Alejandro',
      writeEvents: true,
      writeSnapshot: true,
      sourceLabel: 'Approved test batch',
      sources: [
        {
          kind: 'gmail_reply_discovery',
          payload: {
            representativeExamples: [
              {
                messageId: 'gmail-1',
                from: { email: 'ana@example.com' },
                subject: 'Re: Newsletter',
                observedAt: '2026-05-20T10:00:00.000Z',
                candidateType: 'human_reply_candidate',
                replyConfidence: 'strong',
                reasonCodes: ['human_sender', 'reply_subject_prefix'],
              },
            ],
          },
        },
      ],
    });

    expect(duplicate.summary).toMatchObject({
      eventsAdded: 0,
      duplicateEventsSkipped: 1,
      snapshotsAdded: 0,
      duplicateSnapshotsSkipped: 1,
    });
  });

  test('accepts future source events such as Shopify and Bhakti WhatsApp through the same lane', async () => {
    const { cardStorePath } = await writeCardStore([anaCard()]);

    const report = await buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      sources: [
        {
          kind: 'signal_events',
          payload: {
            events: [
              {
                sourceKind: 'shopify',
                sourceId: 'order-1',
                eventKind: 'purchase',
                channel: 'commerce',
                personId: 'email:ana@example.com',
                email: 'ana@example.com',
                observedAt: NOW,
                metrics: { amount: 49, productKind: 'digital' },
                tags: ['curso de meditacion'],
              },
              {
                sourceKind: 'bhakti_whatsapp',
                sourceId: 'delivery-1',
                eventKind: 'recording_delivery',
                channel: 'whatsapp',
                personId: 'email:ana@example.com',
                email: 'ana@example.com',
                observedAt: NOW,
                quantity: 2,
              },
            ],
          },
        },
      ],
    });

    expect(report.summary).toMatchObject({
      sourceEvents: 2,
      normalizedEvents: 2,
      projectedSignals: 2,
      cardsPreviewed: 1,
    });
    expect(report.projection.summary).toMatchObject({
      bySourceKind: {
        shopify_activity: 1,
        bhakti_whatsapp_activity: 1,
      },
    });
    expect(report.engagementPreview.previewItems[0].aggregatedSignals).toMatchObject({
      whatsapp: { automationDeliveries30d: 2 },
      purchases: { totalSpend: 49, digitalProductsPurchased: 1 },
    });
  });

  test('requires explicit approval before local ledger writes', async () => {
    const { cardStorePath } = await writeCardStore([anaCard()]);
    await expect(buildCrmVNextSignalEventPipeline({
      now: NOW,
      cardStorePath,
      writeEvents: true,
      sources: [{ kind: 'engagement_signals', payload: { signals: [{ email: 'ana@example.com' }] } }],
    })).rejects.toThrow('signal_event_pipeline_approved_by_required_for_writes');
  });
});
