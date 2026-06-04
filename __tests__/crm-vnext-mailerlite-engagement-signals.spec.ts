import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';
import { buildCrmVNextMailerLiteEngagementSignals } from '../lib/crm/crm-vnext-mailerlite-engagement-signals.js';

const NOW = '2026-05-15T12:00:00.000Z';
const execFileAsync = promisify(execFile);

describe('buildCrmVNextMailerLiteEngagementSignals', () => {
  test('converts subscriber rows into engagement-preview signals without live calls', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      snapshot: {
        subscribers: [
          {
            id: 'sub-1',
            email: 'Reader@Example.com',
            status: 'Subscribed',
            opens_30d: '8',
            clicks_30d: 2,
            last_open_at: '2026-05-14T10:00:00.000Z',
            last_click_at: '2026-05-13T10:00:00.000Z',
            aggregate: {
              sent: 14,
              opens_count: 10,
              clicks_count: 1,
              open_rate: 71.43,
              click_rate: 7.14,
              subscribedAt: '2025-08-30T02:12:22.000Z',
            },
            groups: [{ name: 'Newsletter' }, { name: 'Estudiantes' }],
          },
        ],
      },
    });

    expect(report.mode).toBe('read_only_mailerlite_engagement_signal_adapter');
    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      subscriberSignals: 1,
      campaignSignals: 0,
      liveApiCallsPerformed: false,
      credentialsRead: false,
      operationsExecuted: 0,
    });
    expect(report.safety.mailerLiteMutationProhibited).toBe(true);
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'mailerlite_subscriber_activity',
      email: 'reader@example.com',
      opens30d: 8,
      clicks30d: 2,
      lifetimeOpens: 10,
      lifetimeClicks: 1,
      lifetimeSent: 14,
      openRate: 71.43,
      clickRate: 7.14,
      lastOpenAt: '2026-05-14T10:00:00.000Z',
      lastClickAt: '2026-05-13T10:00:00.000Z',
      subscribedAt: '2025-08-30T02:12:22.000Z',
      subscriberStatus: 'active',
      tags: ['Newsletter', 'Estudiantes'],
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('aggregates recent nested campaign activity into campaign signals', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      windowDays: 30,
      snapshot: {
        records: [
          {
            email: 'viviana@example.com',
            subscriber_status: 'active',
            campaignActivity: [
              { campaign_id: 'recent-open', opened_at: '2026-05-14T10:00:00.000Z' },
              { campaign_id: 'old-open', opened_at: '2026-03-01T10:00:00.000Z' },
              { campaign_id: 'recent-click', clicked_at: '2026-05-13T09:00:00.000Z' },
            ],
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      subscriberSignals: 0,
      campaignSignals: 1,
    });
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'mailerlite_campaign_activity',
      email: 'viviana@example.com',
      opens30d: 1,
      clicks30d: 1,
      opens90d: 2,
      clicks90d: 1,
      lastOpenAt: '2026-05-14T10:00:00.000Z',
      lastClickAt: '2026-05-13T09:00:00.000Z',
    });
  });

  test('keeps suppressions as signals and skips records with no match identity', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      snapshot: {
        rows: [
          {
            email: 'suppressed@example.com',
            email_subscriber_status: 'Unsubscribed',
            opens30d: 4,
            sourceId: '/Users/alejandrogomez/private/raw-export.json',
          },
          {
            status: 'active',
            opens30d: 3,
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 2,
      signalsGenerated: 1,
      skippedRecords: 1,
      suppressedSubscribers: 1,
    });
    expect(report.signals[0]).toMatchObject({
      email: 'suppressed@example.com',
      subscriberStatus: 'unsubscribed',
      opens30d: 4,
    });
    expect(report.skippedRecords[0]).toMatchObject({ reason: 'missing_match_identity' });
    expect(JSON.stringify(report)).not.toContain('/Users/');
    expect(report.signals[0].sourceId).toContain('[local-path]');
  });

  test('redacted summary CLI omits subscriber-level arrays and identity values', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'crm-mailerlite-redacted-summary-'));
    try {
      const snapshotPath = join(tempDir, 'synthetic-snapshot.json');
      const outPath = join(tempDir, 'redacted-summary.json');
      await writeFile(snapshotPath, JSON.stringify({
        rows: [
          {
            id: 'subscriber-secret-id',
            email: 'synthetic-redaction@example.test',
            instagramHandle: '@synthetic_private_handle',
            phone: '+1 555 0100',
            personId: 'person-secret-123',
            subscriber_status: 'Unsubscribed',
            opens30d: 4,
            clicks30d: 2,
            opens90d: 7,
            clicks90d: 3,
            lifetimeOpens: 11,
            lifetimeClicks: 5,
            last_open_at: '2026-05-14T10:00:00.000Z',
            last_click_at: '2026-05-13T09:00:00.000Z',
            groups: ['Synthetic Private Group'],
            private_url: 'https://private.example.test/path',
            campaign_body: 'Synthetic campaign body that must not leave the row.',
          },
          {
            status: 'active',
            opens30d: 1,
            raw_payload: { internal: 'raw-row-sentinel' },
          },
        ],
      }), 'utf8');

      const scriptPath = fileURLToPath(new URL('../scripts/crm-vnext-mailerlite-engagement-signals.mjs', import.meta.url));
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        scriptPath,
        '--snapshot-file',
        snapshotPath,
        '--observed-at',
        NOW,
        '--redacted-summary',
        '--out',
        outPath,
      ]);

      expect(stderr).toBe('');
      const terminalReport = JSON.parse(stdout);
      const receiptReport = JSON.parse(await readFile(outPath, 'utf8'));

      for (const report of [terminalReport, receiptReport]) {
        expect(report).not.toHaveProperty('signals');
        expect(report).not.toHaveProperty('skippedRecords');
        expect(report.aggregateCounts).toMatchObject({
          recordsInspected: 2,
          adapterOutputRecords: 1,
          recordsSkipped: 1,
          liveApiCallsPerformed: false,
          credentialsRead: false,
          operationsExecuted: 0,
        });
        expect(report.identityCoverage).toMatchObject({
          usableIdentityCount: 1,
          missingIdentityCount: 1,
          recordsWithEmailAnchor: 1,
          recordsWithInstagramAnchor: 1,
          recordsWithPhoneAnchor: 1,
          recordsWithPersonIdAnchor: 1,
        });
        expect(report.recordsSkippedByReason).toMatchObject({ missing_match_identity: 1 });
        expect(report.fieldAvailability.engagement).toMatchObject({
          opens30d: 1,
          clicks30d: 1,
          opens90d: 1,
          clicks90d: 1,
          lifetimeOpens: 1,
          lifetimeClicks: 1,
        });
        expect(report.outputPolicy).toMatchObject({
          redactedAggregateOnly: true,
          subscriberLevelArraysOmitted: true,
          identityAnchorValuesOmitted: true,
          rawRowsOmitted: true,
        });

        const serialized = JSON.stringify(report);
        expect(serialized).not.toContain('signals');
        expect(serialized).not.toContain('skippedRecords');
        expect(serialized).not.toContain('synthetic-redaction@example.test');
        expect(serialized).not.toContain('synthetic_private_handle');
        expect(serialized).not.toContain('+1 555 0100');
        expect(serialized).not.toContain('person-secret-123');
        expect(serialized).not.toContain('subscriber-secret-id');
        expect(serialized).not.toContain('Synthetic Private Group');
        expect(serialized).not.toContain('https://private.example.test/path');
        expect(serialized).not.toContain('Synthetic campaign body');
        expect(serialized).not.toContain('raw-row-sentinel');
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
