import { describe, expect, test } from 'vitest';
import {
  evaluateCommunityQueueStatus,
  type CommunityQueueStatusReport,
} from '../lib/crm/community-queue-status.js';
import type { CommunityQueueSummary } from '../lib/crm/community-queues.js';

const NOW = '2026-05-09T01:00:00.000Z';

const summary = (
  id: CommunityQueueSummary['id'],
  matched: number,
): CommunityQueueSummary => ({
  id,
  title: id,
  purpose: 'test queue',
  operatorNote: 'test note',
  filters: { limit: 12 },
  counts: {
    total: 728,
    matched,
    returned: Math.min(matched, 12),
  },
});

const byId = (report: CommunityQueueStatusReport, id: CommunityQueueSummary['id']) =>
  report.statuses.find((status) => status.id === id);

describe('community queue status', () => {
  test('marks standing backlog as watch without alerting Alejandro', () => {
    const report = evaluateCommunityQueueStatus(
      [summary('ig_without_email', 98), summary('identity_stitching', 625)],
      { now: NOW },
    );

    expect(byId(report, 'ig_without_email')).toMatchObject({
      level: 'watch',
      shouldAlertAlejandro: false,
      checkCadenceHours: 6,
    });
    expect(byId(report, 'identity_stitching')).toMatchObject({
      level: 'watch',
      shouldAlertAlejandro: false,
      checkCadenceHours: 24,
    });
    expect(report.totals).toEqual({ queues: 2, notify: 0, watch: 2, ok: 0 });
  });

  test('marks human-review and commercial queues as notify when any rows exist', () => {
    const report = evaluateCommunityQueueStatus(
      [summary('human_review_required', 1), summary('commercial_follow_up', 2)],
      { now: NOW },
    );

    expect(byId(report, 'human_review_required')).toMatchObject({
      level: 'notify',
      shouldAlertAlejandro: true,
    });
    expect(byId(report, 'commercial_follow_up')).toMatchObject({
      level: 'notify',
      shouldAlertAlejandro: true,
    });
    expect(report.totals.notify).toBe(2);
  });

  test('uses previous snapshots to detect noteworthy queue growth', () => {
    const report = evaluateCommunityQueueStatus(
      [summary('ig_without_email', 130), summary('identity_stitching', 700)],
      {
        now: NOW,
        previousMatched: {
          ig_without_email: 98,
          identity_stitching: 625,
        },
      },
    );

    expect(byId(report, 'ig_without_email')).toMatchObject({
      level: 'notify',
      deltaMatched: 32,
      shouldAlertAlejandro: true,
    });
    expect(byId(report, 'identity_stitching')).toMatchObject({
      level: 'watch',
      deltaMatched: 75,
      shouldAlertAlejandro: false,
    });
  });

  test('marks empty queues as ok', () => {
    const report = evaluateCommunityQueueStatus(
      [summary('email_engaged', 0), summary('human_review_required', 0)],
      { now: NOW },
    );

    expect(report.totals).toEqual({ queues: 2, notify: 0, watch: 0, ok: 2 });
    expect(report.statuses.every((status) => status.level === 'ok')).toBe(true);
  });
});
