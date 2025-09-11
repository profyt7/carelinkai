// Simple smoke tests for key endpoints; run with: node scripts/smoke-tests.mjs
const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function main() {
  const results = [];
  try {
    const search = await getJson('/api/search?limit=3');
    if (!search.success || !Array.isArray(search.results) || search.results.length === 0) throw new Error('search empty');
    results.push(['GET /api/search', 'OK', `${search.results.length} results`]);
  } catch (e) {
    results.push(['GET /api/search', 'FAIL', e.message]);
  }
  try {
    const caregivers = await getJson('/api/marketplace/caregivers?limit=3');
    if (!Array.isArray(caregivers.data)) throw new Error('bad shape');
    results.push(['GET /api/marketplace/caregivers', 'OK', `${caregivers.data.length} items`]);
  } catch (e) {
    results.push(['GET /api/marketplace/caregivers', 'FAIL', e.message]);
  }
  try {
    const listings = await getJson('/api/marketplace/listings?limit=3');
    if (!Array.isArray(listings.data)) throw new Error('bad shape');
    results.push(['GET /api/marketplace/listings', 'OK', `${listings.data.length} items`]);
  } catch (e) {
    results.push(['GET /api/marketplace/listings', 'FAIL', e.message]);
  }
  try {
    const providers = await getJson('/api/marketplace/providers?limit=3');
    if (!Array.isArray(providers.data)) throw new Error('bad shape');
    results.push(['GET /api/marketplace/providers', 'OK', `${providers.data.length} items`]);
  } catch (e) {
    results.push(['GET /api/marketplace/providers', 'FAIL', e.message]);
  }

  const ok = results.every(([, status]) => status === 'OK');
  const lines = results.map(r => r.join(' | ')).join('\n');
  console.log(lines);
  process.exit(ok ? 0 : 1);
}

main();
