const ENDPOINT = 'https://api.cron-job.org';
const API_KEY = process.env.CRONJOB_API_KEY || '';

if (!API_KEY) {
  console.error('Missing CRONJOB_API_KEY');
  process.exit(1);
}

const BASE = process.env.BASE_URL || 'https://crm-manychat-webhook.vercel.app';
const TITLE = process.env.CRONJOB_TITLE || 'CRM Reprocess Events (prod)';
const TOKEN = process.env.API_TOKEN || '';
const ZONE = process.env.CRONJOB_TZ || 'America/Bogota';

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

const jobPayload = () => ({
  job: {
    enabled: true,
    title: TITLE,
    url: `${BASE.replace(/\/$/, '')}/api/reprocess-events`,
    saveResponses: false,
    requestTimeout: 60,
    requestMethod: 0, // 0 = GET
    schedule: {
      timezone: ZONE,
      expiresAt: 0,
      hours: [-1],
      mdays: [-1],
      months: [-1],
      wdays: [-1],
      minutes: [0, 15, 30, 45],
    },
    extendedData: TOKEN ? { headers: { 'x-api-token': TOKEN } } : { headers: {} },
  },
});

async function main() {
  const listResponse = await fetch(`${ENDPOINT}/jobs`, { headers });
  if (!listResponse.ok) {
    console.error('List jobs failed', listResponse.status, await listResponse.text());
    process.exit(2);
  }
  const { jobs = [] } = (await listResponse.json()) ?? {};

  const targetUrl = `${BASE.replace(/\/$/, '')}/api/reprocess-events`;
  const existing = jobs.find((job) => job.title === TITLE || job.url === targetUrl);

  if (existing?.jobId) {
    const updateResponse = await fetch(`${ENDPOINT}/jobs/${existing.jobId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(jobPayload()),
    });
    if (!updateResponse.ok) {
      console.error('Patch job failed', updateResponse.status, await updateResponse.text());
      process.exit(3);
    }
    console.log(`Updated cron-job ${existing.jobId} (${TITLE})`);
    return;
  }

  const createResponse = await fetch(`${ENDPOINT}/jobs`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(jobPayload()),
  });
  const created = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok) {
    console.error('Create job failed', createResponse.status, created);
    process.exit(4);
  }
  console.log('Created cron-job', created);
}

main().catch((error) => {
  console.error(error);
  process.exit(99);
});
