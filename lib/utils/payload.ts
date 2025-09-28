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
