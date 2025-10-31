/*
  Seed calendar events via API.
  Usage:
    ADMIN_JWT="<admin token>" node scripts/seed_calendar.js --count=40 --url=http://localhost:10000/api/calendar/seed/reset
*/

async function ensureFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

function parseArgs(argv) {
  const args = { count: 40, url: 'http://localhost:10000/api/calendar/seed/reset' };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--count=')) args.count = parseInt(arg.split('=')[1], 10) || 40;
    if (arg.startsWith('--url=')) args.url = arg.split('=')[1];
  }
  return args;
}

(async () => {
  try {
    const { count, url } = parseArgs(process.argv);
    const token = process.env.ADMIN_JWT;
    if (!token) {
      console.error('ERROR: ADMIN_JWT environment variable is not set.');
      process.exit(1);
    }

    const doFetch = await ensureFetch();
    const res = await doFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count })
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      console.error('Request failed:', res.status, res.statusText, data);
      process.exit(1);
    }

    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unhandled error:', err);
    process.exit(1);
  }
})();


