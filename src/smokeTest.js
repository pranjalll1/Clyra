// Automated checks for a running API (local or deployed). Needs Node 18+.
//   node src/smokeTest.js                                  -> http://localhost:5001
//   node src/smokeTest.js https://your-api.onrender.com
// Optional signed-in checks (only work when Turnstile is off or you use the dev accounts locally):
//   SMOKE_STUDENT_EMAIL=... SMOKE_STUDENT_PASSWORD=... SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node src/smokeTest.js
const BASE = (process.argv[2] || process.env.SMOKE_API || 'http://localhost:3000').replace(/\/$/, '') + '/api/v1';
let pass = 0, fail = 0, skip = 0;

const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? '✓' : '✗'} ${name}${cond ? '' : ` ${extra}`}`); };
const skipped = (name, why) => { skip++; console.log(`  - ${name} (skipped: ${why})`); };
const section = (t) => console.log(`\n${t}`);

async function call(method, path, { body, cookie } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { status: 0, json: null, text: '', cookie: '' }; // could not connect
  }
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  const sc = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')].filter(Boolean);
  return { status: res.status, json, text, cookie: sc.map((c) => c.split(';')[0]).join('; ') };
}

async function signIn(email, password) {
  const r = await call('POST', '/auth/login', { body: { email, password } });
  if (r.json?.code === 'CAPTCHA_FAILED') return { skip: 'Turnstile is on for this API' };
  return r.status === 200 && r.cookie ? { cookie: r.cookie } : { fail: `login returned ${r.status}` };
}

console.log(`Checking ${BASE}`);

section('Server and public data');
const health = await call('GET', '/health');
if (health.status === 0) {
  console.log('  ✗ cannot reach the API. Is it running, and is the address right?');
  process.exit(1);
}
ok('health endpoint answers', health.status === 200 && health.json?.ok === true);
const cats = await call('GET', '/categories');
ok('categories are seeded', cats.status === 200 && cats.json?.items?.length >= 5, `(got ${cats.json?.items?.length})`);
const venues = await call('GET', '/venues');
ok('venues are seeded', venues.status === 200 && venues.json?.items?.length >= 10, `(got ${venues.json?.items?.length})`);
const events = await call('GET', '/events');
ok('public event list works', events.status === 200 && Array.isArray(events.json?.items) && !!events.json?.facets);
ok('event list has events', (events.json?.items?.length || 0) > 0, '(run the seed scripts)');
const first = events.json?.items?.[0];
if (first) {
  const d = await call('GET', `/events/by-slug/${first.slug}`);
  ok('event detail by slug works', d.status === 200 && d.json?.event?.title === first.title);
}
ok('unknown slug returns 404', (await call('GET', '/events/by-slug/not-a-real-event')).status === 404);
ok('bad filter value returns 400', (await call('GET', '/events?price=banana')).status === 400);
const free = await call('GET', '/events?price=free');
ok('price=free only returns free events', free.status === 200 && free.json.items.every((e) => e.price?.isFree));

section('Nothing private leaks to the public');
const blob = events.text + (first ? JSON.stringify(first) : '');
for (const key of ['createdBy', 'rejectionNote', 'conflictOverride', 'passwordHash']) ok(`public events do not expose ${key}`, !blob.includes(key));

section('Access control (signed out)');
for (const [path, label] of [
  ['/users/me', 'current user'], ['/organizer/events', 'organizer dashboard'], ['/notifications/unread-count', 'notifications'],
  ['/organizer-applications/mine', 'my organizer request'], ['/organizer-applications', 'organizer request queue'], ['/admin-dashboard/stats', 'admin stats'],
]) ok(`${label} requires sign-in`, (await call('GET', path)).status === 401);
ok('creating an event requires sign-in', (await call('POST', '/events', { body: { title: 'x' } })).status === 401);

section('Input rules');
const weak = await call('POST', '/auth/register', { body: { name: 'Test User', email: 'test@lpu.in', password: 'weakpass' } });
weak.json?.code === 'CAPTCHA_FAILED' ? skipped('weak password is rejected', 'Turnstile is on') : ok('weak password is rejected', weak.status === 400 && !!weak.json?.fields?.password);
const foreign = await call('POST', '/auth/register', { body: { name: 'Test User', email: 'test@gmail.com', password: 'Strong#Pass1' } });
foreign.json?.code === 'CAPTCHA_FAILED' ? skipped('non-college email is rejected', 'Turnstile is on') : ok('non-college email is rejected', foreign.status === 400 && !!foreign.json?.fields?.email);

const st = process.env.SMOKE_STUDENT_EMAIL && (await signIn(process.env.SMOKE_STUDENT_EMAIL, process.env.SMOKE_STUDENT_PASSWORD));
section('Signed in as a student');
if (!process.env.SMOKE_STUDENT_EMAIL) skipped('student checks', 'set SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD');
else if (st.skip || st.fail) skipped('student checks', st.skip || st.fail);
else {
  const me = await call('GET', '/users/me', { cookie: st.cookie });
  ok('current user is a student', me.status === 200 && me.json?.user?.role === 'student');
  ok('student cannot open the organizer dashboard', (await call('GET', '/organizer/events', { cookie: st.cookie })).status === 403);
  ok('student cannot open admin stats', (await call('GET', '/admin-dashboard/stats', { cookie: st.cookie })).status === 403);
  ok('student cannot review organizer requests', (await call('GET', '/organizer-applications', { cookie: st.cookie })).status === 403);
  ok('student cannot create events', (await call('POST', '/events', { cookie: st.cookie, body: { title: 'Sneaky event' } })).status === 403);
  const n = await call('GET', '/notifications/unread-count', { cookie: st.cookie });
  ok('notifications unread count works', n.status === 200 && typeof n.json?.unread === 'number');
  ok('organizer request form validates', (await call('POST', '/organizer-applications', { cookie: st.cookie, body: {} })).status === 400);
}

const ad = process.env.SMOKE_ADMIN_EMAIL && (await signIn(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD));
section('Signed in as an admin');
if (!process.env.SMOKE_ADMIN_EMAIL) skipped('admin checks', 'set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD');
else if (ad.skip || ad.fail) skipped('admin checks', ad.skip || ad.fail);
else {
  const stats = await call('GET', '/admin-dashboard/stats', { cookie: ad.cookie });
  ok('admin stats load', stats.status === 200 && typeof stats.json?.publishedEvents === 'number');
  ok('organizer request queue loads', (await call('GET', '/organizer-applications?status=pending', { cookie: ad.cookie })).status === 200);
  ok('admin can open the event dashboard', (await call('GET', '/organizer/events', { cookie: ad.cookie })).status === 200);
}

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
