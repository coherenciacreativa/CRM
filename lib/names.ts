const SMALL = new Set(['de','del','la','las','los','y','e','da','do','dos','das']);

export function stripEmoji(s = '') {
  return s.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\uFE00-\uFE0F]|\p{Extended_Pictographic})/gu,
    '',
  );
}

export function titleCaseName(raw?: string | null) {
  if (!raw) return null;
  let s = stripEmoji(String(raw)).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  s = s.toLowerCase();
  return s
    .split(' ')
    .map((word, index) => (SMALL.has(word) && index > 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function looksLikeName(s?: string | null) {
  if (!s) return false;
  if (/@/.test(s)) return false;
  if (/[_\-]{2,}/.test(s)) return false;
  const letters = (s.match(/\p{L}/gu) || []).length;
  return letters >= 3;
}

export function bestName(opts: { fullName?: string | null; username?: string | null; email?: string | null }): {
  name: string | null;
  source: 'instagram_full_name' | 'instagram_handle_titlecase' | 'email_local' | 'unknown';
} {
  const full = titleCaseName(opts.fullName);
  if (looksLikeName(full)) return { name: full!, source: 'instagram_full_name' };

  const normalizedHandle = String(opts.username || '').replace(/[_\.]+/g, ' ');
  const fromUser = titleCaseName(normalizedHandle);
  if (looksLikeName(fromUser)) return { name: fromUser!, source: 'instagram_handle_titlecase' };

  const local = titleCaseName((opts.email || '').split('@')[0].replace(/[._\-]+/g, ' '));
  if (looksLikeName(local)) return { name: local!, source: 'email_local' };

  return { name: null, source: 'unknown' };
}
