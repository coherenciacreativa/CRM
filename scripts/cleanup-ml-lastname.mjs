const KEY = process.env.MAILERLITE_API_KEY || '';
if (!KEY) {
  console.error('Missing MAILERLITE_API_KEY');
  process.exit(1);
}

const emails = (process.env.FIX_EMAILS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!emails.length) {
  console.error('Provide FIX_EMAILS');
  process.exit(2);
}

const ML = 'https://connect.mailerlite.com/api';

const looksLikePlaceholder = (value = '') =>
  /{{|}}|%7B%7B|%7D%7D|<[^>]*>|\[|\]|\{|\}/i.test(String(value));

async function upsert(email, fields) {
  const response = await fetch(`${ML}/subscribers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resubscribe: true, fields }),
  });
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`ML upsert ${email} → ${response.status}: ${JSON.stringify(json)}`);
  }
  console.log('OK', email, fields);
}

async function main() {
  for (const email of emails) {
    const fields = { last_name: '' };
    await upsert(email, fields);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(99);
});
