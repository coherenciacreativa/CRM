import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  buildCrmVNextSignalPacketInbox,
  buildCrmVNextSignalPacketInboxFromReportsDir,
  classifyCrmVNextSignalPacket,
  renderCrmVNextSignalPacketInboxMarkdown,
} from '../lib/crm/crm-vnext-signal-packet-inbox.js';

const NOW = '2026-05-22T12:00:00.000Z';
let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-signal-packet-inbox-'));
  dirs.push(dir);
  return dir;
};

const instagramSignalEventsPacket = {
  schemaVersion: 'crm-vnext-instagram-signal-events-2026-05-21',
  mode: 'read_only_instagram_signal_events',
  generatedAt: '2026-05-22T10:00:00.000Z',
  events: [
    {
      eventKind: 'instagram_story_view',
      sourceKind: 'instagram_messages_ui',
      observedAt: '2026-05-22T09:00:00.000Z',
      instagramHandle: 'cielo_gom_g',
    },
  ],
};

const mailerLiteSnapshotPacket = {
  mode: 'read_only_mailerlite_engagement_snapshot',
  generatedAt: '2026-05-21T12:00:00.000Z',
  scan: {
    cursorPaginationUsed: true,
    pages: 14,
    subscribersScanned: 1370,
  },
  records: [
    {
      email: 'example@example.com',
      status: 'active',
      opens30d: 3,
    },
  ],
};

const pipelineOutput = {
  schemaVersion: 'crm-vnext-signal-event-pipeline-2026-05-21',
  mode: 'read_only_signal_event_pipeline',
  generatedAt: '2026-05-21T13:00:00.000Z',
  sourceReports: [
    {
      kind: 'mailerlite_snapshot',
      pathLabel: 'crm_vnext_mailerlite_engagement_snapshot_2026-05-21.json',
    },
  ],
};

const activeInstagramBlocker = {
  schemaVersion: 'mantis.crm_vnext.source_recovery_preflight.v1',
  status: 'awaiting_human_unblock',
  mode: 'read_only_strict_preflight',
  createdAtLocal: '2026-05-22T08:00:00+09:00',
  preflight: {
    instagram_messages_ui: {
      status: 'blocked_requires_human_unblock',
      blockerType: 'login_required',
    },
  },
};

describe('CRM vNext signal packet inbox', () => {
  test('classifies supplied signal input packets without touching live sources', () => {
    expect(classifyCrmVNextSignalPacket({
      fileName: 'crm_vnext_instagram_signal_events.json',
      payload: instagramSignalEventsPacket,
    })).toMatchObject({
      packetKind: 'signal_events',
      actionable: true,
    });

    expect(classifyCrmVNextSignalPacket({
      fileName: 'crm_vnext_mailerlite_engagement_snapshot_2026-05-21.json',
      payload: mailerLiteSnapshotPacket,
    })).toMatchObject({
      packetKind: 'mailerlite_snapshot',
      actionable: true,
    });

    expect(classifyCrmVNextSignalPacket({
      fileName: 'crm_vnext_signal_event_pipeline_dry_run_2026-05-21.json',
      payload: pipelineOutput,
    })).toMatchObject({
      packetKind: 'generated_output',
      actionable: false,
    });
  });

  test('finds unprocessed packets, suppresses already-processed inputs, and reports blockers', () => {
    const report = buildCrmVNextSignalPacketInbox({
      now: NOW,
      files: [
        {
          fileName: '/Users/example/Mantis-Reports/crm_vnext_instagram_signal_events_2026-05-22.json',
          modifiedAt: '2026-05-22T10:01:00.000Z',
          payload: instagramSignalEventsPacket,
        },
        {
          fileName: '/Users/example/Mantis-Reports/crm_vnext_mailerlite_engagement_snapshot_2026-05-21.json',
          modifiedAt: '2026-05-21T12:01:00.000Z',
          payload: mailerLiteSnapshotPacket,
        },
        {
          fileName: '/Users/example/Mantis-Reports/crm_vnext_signal_event_pipeline_dry_run_2026-05-21.json',
          modifiedAt: '2026-05-21T13:01:00.000Z',
          payload: pipelineOutput,
        },
        {
          fileName: '/Users/example/Mantis-Reports/crm_vnext_source_recovery_awaiting_human_unblock_2026-05-22.json',
          modifiedAt: '2026-05-22T08:01:00.000Z',
          payload: activeInstagramBlocker,
        },
        {
          fileName: '/Users/example/Mantis-Reports/crm_vnext_daily_operator_handoff_2026-05-22.json',
          modifiedAt: '2026-05-22T07:00:00.000Z',
          payload: {
            schemaVersion: 'crm-vnext-daily-operator-handoff-2026-05-21',
            mode: 'read_only_daily_operator_handoff',
          },
        },
      ],
    });

    expect(report.summary).toMatchObject({
      candidatePackets: 1,
      processedInputPackets: 1,
      activeBlockers: 1,
      recommendation: 'run_signal_event_pipeline_preview',
    });
    expect(report.candidatePackets[0]).toMatchObject({
      fileName: 'crm_vnext_instagram_signal_events_2026-05-22.json',
      packetKind: 'signal_events',
      pipelineFlag: '--events-file',
    });
    expect(report.candidatePackets[0].recommendedCommand).toContain('--events-file');
    expect(report.processedInputPackets[0]).toMatchObject({
      fileName: 'crm_vnext_mailerlite_engagement_snapshot_2026-05-21.json',
      processorFileName: 'crm_vnext_signal_event_pipeline_dry_run_2026-05-21.json',
    });
    expect(report.blockerPackets[0]).toMatchObject({
      fileName: 'crm_vnext_source_recovery_awaiting_human_unblock_2026-05-22.json',
      lanes: ['instagram_ui'],
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('scans a reports directory and renders a compact Markdown handoff', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'crm_vnext_instagram_signal_events_2026-05-22.json'), JSON.stringify(instagramSignalEventsPacket, null, 2));
    await writeFile(join(dir, 'crm_vnext_daily_operator_handoff_2026-05-22.json'), JSON.stringify({
      schemaVersion: 'crm-vnext-daily-operator-handoff-2026-05-21',
      mode: 'read_only_daily_operator_handoff',
    }, null, 2));

    const report = await buildCrmVNextSignalPacketInboxFromReportsDir({
      reportsDir: dir,
      now: NOW,
      sinceDays: 14,
    });
    const markdown = renderCrmVNextSignalPacketInboxMarkdown(report);

    expect(report.summary.candidatePackets).toBe(1);
    expect(markdown).toContain('CRM vNext Signal Packet Inbox');
    expect(markdown).toContain('crm_vnext_instagram_signal_events_2026-05-22.json');
    expect(markdown).not.toContain(dir);
  });
});
