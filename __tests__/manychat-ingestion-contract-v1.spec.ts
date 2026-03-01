import { describe, expect, test } from 'vitest';
import {
  buildCanonicalIngestionEventV1,
  buildContractNormalizedPayload,
} from '../lib/manychat/ingestion-contract-v1.js';

describe('manychat ingestion contract v1', () => {
  test('normalizes payload for flow To CRM copy 2', () => {
    const payload = {
      source: 'instagram',
      channel: 'instagram',
      flow_id: 'content20250930140219_013526',
      flow_name: 'To CRM copy 2',
      trigger_type: 'keyword_dm',
      event: 'message_received',
      contact_id: '563924665',
      timestamp: 1_772_341_600,
      last_text_input: 'Hola, mi correo es persona@example.com',
      message_id: 'msg-01',
      flow_status: 'LIVE',
    };

    const { contract, requiredMissing } = buildCanonicalIngestionEventV1(payload);

    expect(requiredMissing).toEqual([]);
    expect(contract.version).toBe('v1');
    expect(contract.flow_name).toBe('To CRM copy 2');
    expect(contract.source_platform).toBe('instagram');
    expect(contract.contact_id).toBe('563924665');
    expect(contract.trigger_type).toBe('keyword_dm');
    expect(contract.message_text).toContain('persona@example.com');
    expect(contract.status_normalized).toBe('LIVE');
    expect(contract.dedupe_key.startsWith('dpk:')).toBe(true);
  });

  test('normalizes payload with nested flow + full contact for audio variant', () => {
    const payload = {
      platform: 'instagram',
      flow: {
        id: 'content20260213192513_254711',
        name: 'To CRM copy 3 con flow de audio',
        status: 'STOPPED',
      },
      event_type: 'audio_reply',
      message: {
        type: 'audio',
        text: 'Te dejo un audio con mis datos',
      },
      full_contact_data: {
        id: 'user:998877',
      },
      created_at: '2026-03-01T10:00:00.000Z',
    };

    const { contract, requiredMissing } = buildCanonicalIngestionEventV1(payload);

    expect(requiredMissing).toEqual([]);
    expect(contract.flow_id).toBe('content20260213192513_254711');
    expect(contract.flow_name).toBe('To CRM copy 3 con flow de audio');
    expect(contract.trigger_type).toBe('audio_reply');
    expect(contract.contact_id).toBe('998877');
    expect(contract.message_text).toBe('Te dejo un audio con mis datos');
    expect(contract.status_normalized).toBe('STOPPED');
  });

  test('normalizes legacy To CRM payload and keeps deterministic dedupe key', () => {
    const payload = {
      channel: 'instagram',
      automation_id: 'content20250914162443_862288',
      automation_name: 'To CRM',
      event: 'message_received',
      subscriber: { id: '777000' },
      text: 'Quiero información',
      timestamp: '2026-03-01T12:00:00.000Z',
      status: 'stopped',
    };

    const first = buildCanonicalIngestionEventV1(payload).contract;
    const second = buildCanonicalIngestionEventV1(payload).contract;

    expect(first.flow_name).toBe('To CRM');
    expect(first.contact_id).toBe('777000');
    expect(first.message_text).toBe('Quiero información');
    expect(first.status_normalized).toBe('STOPPED');
    expect(first.dedupe_key).toBe(second.dedupe_key);
  });

  test('normalizes buffer flow payload and hydrates normalized webhook shape', () => {
    const payload = {
      source_platform: 'instagram',
      channel: 'instagram',
      flow_name: 'Buffer — Accumulate DMs (40s window)',
      flow_id: 'content20251001232041_100556',
      trigger: 'buffer_window',
      contact: { id: '123123' },
      Full_Contact_Data: [
        {
          id: 'user:123123',
          custom_fields: {
            last_dm_text: 'Mensaje buffer acumulado en 40 segundos',
          },
        },
      ],
      received_at: '2026-03-01T14:00:00.000Z',
    };

    const { contract, requiredMissing } = buildCanonicalIngestionEventV1(payload);

    expect(requiredMissing).toEqual([]);
    expect(contract.flow_name).toBe('Buffer — Accumulate DMs (40s window)');
    expect(contract.trigger_type).toBe('buffer_window');
    expect(contract.contact_id).toBe('123123');
    expect(contract.message_text).toContain('40 segundos');

    const normalized = buildContractNormalizedPayload(payload, contract);
    expect(normalized.contact_id).toBe('123123');
    expect((normalized.contact as { id?: string }).id).toBe('123123');
    expect((normalized.message as { text?: string }).text).toContain('40 segundos');
    expect(normalized.flow_name).toBe('Buffer — Accumulate DMs (40s window)');
  });
});
