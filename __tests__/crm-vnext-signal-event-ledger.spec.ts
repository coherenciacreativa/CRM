import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  appendCrmSignalEventLedger,
  buildCrmSignalEventLedgerInput,
  normalizeCrmSignalEvent,
  readCrmSignalEventLedger,
} from '../lib/crm/crm-vnext-signal-event-ledger.js';

const NOW = '2026-05-21T12:00:00.000Z';

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempLedger = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-signal-events-'));
  dirs.push(dir);
  return join(dir, 'ledger.jsonl');
};

const payload = () => ({
  signals: [
    {
      sourceKind: 'mailerlite_subscriber_activity',
      sourceId: '/Users/alejandrogomez/private/mailer/cielo.json',
      email: 'cielotago@gmail.com',
      observedAt: '2026-05-21T10:00:00.000Z',
      opens30d: 2,
      clicks30d: 1,
      lifetimeOpens: 12,
      lastOpenAt: '2026-05-20T10:30:00.000Z',
      subscriberStatus: 'active',
      tags: ['Bogota', 'Retiro interest'],
    },
    {
      sourceKind: 'gmail_reply_activity',
      sourceId: 'gmail-reply-1',
      personId: 'email:macarena@example.com',
      email: 'macarena@example.com',
      observedAt: '2026-05-20T08:00:00.000Z',
      replies30d: 1,
      lastReplyAt: '2026-05-20T08:00:00.000Z',
      confidence: 'strong',
      summary: 'Human reply to newsletter, body omitted.',
    },
    {
      sourceKind: 'manual_engagement_snapshot',
      sourceId: 'manual-no-anchor',
      observedAt: '2026-05-19T08:00:00.000Z',
      summary: 'This should not be stored without any identity anchor.',
    },
  ],
});

describe('CRM vNext signal event ledger', () => {
  test('normalizes supplied engagement signals into canonical events', () => {
    const report = buildCrmSignalEventLedgerInput(payload(), {
      now: NOW,
      sourceLabel: 'Engagement packet',
      collector: 'Codex',
    });

    expect(report.schemaVersion).toBe('crm-vnext-signal-event-ledger-2026-05-21');
    expect(report.summary).toMatchObject({
      recordsRead: 3,
      eventsGenerated: 2,
      skippedRecords: 1,
      emailAnchored: 2,
    });
    expect(report.events[0]).toMatchObject({
      schemaVersion: 'crm-vnext-stored-signal-event-2026-05-21',
      source: {
        kind: 'mailerlite_subscriber_activity',
        label: 'Engagement packet',
        collector: 'Codex',
      },
      subject: {
        email: 'cielotago@gmail.com',
      },
      event: {
        kind: 'email_engagement_snapshot',
        channel: 'email',
        direction: 'inbound',
        metrics: {
          opens30d: 2,
          clicks30d: 1,
          lastOpenAt: '2026-05-20T10:30:00.000Z',
          subscriberStatus: 'active',
        },
      },
    });
    expect(report.events[0].source.sourceId).toMatch(/^\[local-path\]:[a-f0-9]{16}$/);
    expect(report.events[1].event.kind).toBe('email_reply');
    expect(JSON.stringify(report)).not.toContain('/Users/');
    expect(report.safety.cardMutationProhibited).toBe(true);
    expect(report.safety.scoreMutationProhibited).toBe(true);
  });

  test('normalizes direct canonical-looking events and preserves restricted handling', () => {
    const { event, skipped } = normalizeCrmSignalEvent({
      eventKind: 'community_event_attendance',
      channel: 'manual',
      direction: 'internal',
      personId: 'ig:cielo_gom_g',
      observedAt: NOW,
      restricted: true,
      reasonCodes: ['therapy_context_review_only'],
      metrics: { occurrences: 1 },
    }, { now: NOW });

    expect(skipped).toBeNull();
    expect(event).toMatchObject({
      subject: { personId: 'ig:cielo_gom_g' },
      event: {
        kind: 'community_event_attendance',
        channel: 'manual',
        direction: 'internal',
        metrics: { occurrences: 1 },
      },
      sensitivity: {
        restricted: true,
        reasonCodes: ['therapy_context_review_only'],
      },
    });
  });

  test('previews, commits, reads, and skips duplicate events', async () => {
    const ledgerPath = await tempLedger();

    const preview = await appendCrmSignalEventLedger({
      payload: payload(),
      commit: false,
      ledgerPath,
      now: NOW,
      sourceLabel: 'Dry run',
    });
    expect(preview.committed).toBe(false);
    expect(preview.added).toHaveLength(2);
    expect(preview.summaryAfter.events).toBe(0);

    const committed = await appendCrmSignalEventLedger({
      payload: payload(),
      commit: true,
      approvedBy: 'Alejandro',
      ledgerPath,
      now: NOW,
      sourceLabel: 'Approved run',
    });
    expect(committed.committed).toBe(true);
    expect(committed.added).toHaveLength(2);
    expect(committed.summaryAfter).toMatchObject({
      events: 2,
      emailAnchored: 2,
      byKind: {
        email_engagement_snapshot: 1,
        email_reply: 1,
      },
    });

    const duplicate = await appendCrmSignalEventLedger({
      payload: payload(),
      commit: true,
      approvedBy: 'Alejandro',
      ledgerPath,
      now: NOW,
    });
    expect(duplicate.added).toHaveLength(0);
    expect(duplicate.duplicatesSkipped).toHaveLength(2);

    const ledger = await readCrmSignalEventLedger(ledgerPath, { now: NOW });
    expect(ledger.summary.events).toBe(2);
    expect(ledger.events[0].observedAt).toBe('2026-05-21T10:00:00.000Z');
    expect(ledger.safety.outboundProhibited).toBe(true);
  });

  test('requires an approver for committed writes', async () => {
    const ledgerPath = await tempLedger();
    await expect(appendCrmSignalEventLedger({
      payload: payload(),
      commit: true,
      ledgerPath,
      now: NOW,
    })).rejects.toThrow('signal_event_approved_by_required');
  });
});
