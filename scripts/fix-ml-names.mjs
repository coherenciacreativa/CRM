const ENDPOINT = 'https://connect.mailerlite.com/api/subscribers';
const API_KEY = process.env.MAILERLITE_API_KEY || '';

if (!API_KEY) {
  console.error('Missing MAILERLITE_API_KEY');
  process.exit(1);
}

const emails = (process.env.FIX_EMAILS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function toTitleCase(value) {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

async function upsert(email, name) {
  const payload = { email, fields: name ? { name } : {} };
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MailerLite upsert failed for ${email}: ${response.status} ${JSON.stringify(json)}`);
  }
  console.log('OK', email, name || '(empty)');
}

async function main() {
  if (!emails.length) {
    console.error('Use FIX_EMAILS="a@b.com,c@d.com" npm run fix:names');
    process.exit(2);
  }

  for (const email of emails) {
    const localPart = email.split('@')[0] || '';
    let name = '';
    if (/[._\-]/.test(localPart)) {
      name = toTitleCase(localPart.replace(/\d+/g, ' '));
    } else if (/^[a-z]{3,}$/i.test(localPart)) {
      name = toTitleCase(localPart);
    }
    try {
      await upsert(email, name || undefined);
    } catch (error) {
      console.error('Failed', email, error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(99);
});
