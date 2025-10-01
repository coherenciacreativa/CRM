export function getDmText(payload: any): string {
  const tryKeys = [
    'last_text_input',
    'last_input_text',
    'text',
    'message',
    'message_text',
    'content',
    'last_received_message_text',
  ];

  for (const key of tryKeys) {
    const value = payload?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const subscriber = payload?.subscriber || {};
  const subscriberKeys = ['last_text_input', 'last_input_text', 'message_text'];
  for (const key of subscriberKeys) {
    const value = subscriber?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const nestedMessage = payload?.message;
  if (nestedMessage && typeof nestedMessage === 'object') {
    const nestedText = (nestedMessage as Record<string, unknown>).text;
    if (typeof nestedText === 'string' && nestedText.trim()) {
      return nestedText.trim();
    }
  }

  const fullContact = payload?.Full_Contact_Data ?? payload?.full_contact_data ?? payload?.fullContactData;
  const fullContacts = Array.isArray(fullContact)
    ? fullContact
    : fullContact && typeof fullContact === 'object'
      ? [fullContact]
      : [];
  for (const entry of fullContacts) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const candidate =
      (typeof record.last_input_text === 'string' && record.last_input_text.trim()) ? record.last_input_text.trim() :
      (typeof record.last_dm_text === 'string' && record.last_dm_text.trim()) ? record.last_dm_text.trim() :
      (record.custom_fields && typeof record.custom_fields === 'object'
        ? (() => {
            const cf = record.custom_fields as Record<string, unknown>;
            const lastDm = cf.last_dm_text;
            return typeof lastDm === 'string' && lastDm.trim() ? lastDm.trim() : undefined;
          })()
        : undefined);
    if (candidate) return candidate;
  }

  return '';
}

export function makeDedupeKey(provider: 'instagram', contactId?: string | null, text?: string | null) {
  const normalizedText = (text || '').replace(/\s+/g, ' ').trim();
  const base = `${provider}|${contactId || ''}|${normalizedText}`.slice(0, 512);
  let hash = 0;
  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) | 0;
  }
  return `dpk:${hash}`;
}
