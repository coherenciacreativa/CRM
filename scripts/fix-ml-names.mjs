const ML = 'https://connect.mailerlite.com/api/subscribers';
const KEY = process.env.MAILERLITE_API_KEY || '';
if (!KEY) { console.error('Missing MAILERLITE_API_KEY'); process.exit(1); }

const emails = (process.env.FIX_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);

function title(s) {
  return s
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function upsert(email, name) {
  const fields = name ? { name } : { name: '' };
  const r = await fetch(ML, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fields }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ML upsert ${email} → ${r.status}: ${JSON.stringify(j)}`);
  console.log('OK', email, name || '(empty)');
}

async function main() {
  if (!emails.length) {
    console.error('Use FIX_EMAILS env with comma-separated emails');
    process.exit(2);
  }
  for (const email of emails) {
    let name = '';
    const lp = email.split('@')[0];
    if (/[._]/.test(lp)) name = title(lp.replace(/\d+/g, ' '));
    else if (/^[a-z]{3,}$/i.test(lp)) name = title(lp);
    await upsert(email, name || undefined);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});
