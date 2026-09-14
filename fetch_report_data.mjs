// Fetches raw Instagram stats for @mama_eti__deals and writes them to latest_data.json,
// committed back to this repo. Runs on GitHub's own runners (real internet access) because
// the claude.ai routine that used to do this directly (weekly measurement loop,
// trig_01JnKCjugVmUTwDuPLsdfC97) sits in a sandbox whose egress policy blocks
// graph.instagram.com (confirmed via diagnostic curl, 2026-09-13 run: "403 connect_rejected
// (organization policy)") -- but does allow github.com-family hosts, so that routine can
// still read this file back via raw.githubusercontent.com -- which requires this repo to be
// PUBLIC (an anonymous curl to a private repo's raw URL 404s, first found the hard way when
// the routine's own test run hit exactly that). Credentials come from repo secrets
// (MAMA_ETI_USER_ID / MAMA_ETI_ACCESS_TOKEN), never committed, so a public repo is safe here.
// This script does ONLY the mechanical data pull; the routine still does the actual analysis
// (vs. baseline/goals) and writes+sends the Gmail draft itself, unchanged -- that's a
// judgment call worth a real Claude read, not a canned script sentence.
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.env.MAMA_ETI_API_BASE || 'https://graph.instagram.com/v23.0';
const IGID = process.env.MAMA_ETI_USER_ID;
const TOKEN = process.env.MAMA_ETI_ACCESS_TOKEN;
if (!IGID || !TOKEN) { console.error('Missing MAMA_ETI_USER_ID / MAMA_ETI_ACCESS_TOKEN env vars.'); process.exit(1); }

async function get(path, params) {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN }).toString();
  const res = await fetch(`${BASE}/${path}?${qs}`);
  return res.json();
}

const out = { fetched_at: new Date().toISOString(), error: null };

const me = await get('me', { fields: 'followers_count,media_count' });
if (me.error) {
  out.error = `/me failed: ${JSON.stringify(me.error)}`;
  writeFileSync('./latest_data.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.error(out.error);
  process.exit(1);
}
out.followers_count = me.followers_count;
out.media_count = me.media_count;

const media = await get('me/media', {
  fields: 'id,media_type,media_product_type,timestamp,like_count,comments_count,caption',
  limit: '10',
});
if (media.error) {
  out.error = `/me/media failed: ${JSON.stringify(media.error)}`;
  writeFileSync('./latest_data.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.error(out.error);
  process.exit(1);
}

const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
const recent = (media.data || []).filter((m) => new Date(m.timestamp).getTime() >= eightDaysAgo);

out.posts = [];
for (const m of recent) {
  const insights = await get(`${m.id}/insights`, { metric: 'reach,saved,shares,views,total_interactions' });
  out.posts.push({
    id: m.id,
    type: m.media_type,
    product_type: m.media_product_type,
    timestamp: m.timestamp,
    like_count: m.like_count,
    comments_count: m.comments_count,
    caption: m.caption,
    insights: insights.data || insights, // keep raw so a real error is visible too, not swallowed
  });
}

writeFileSync('./latest_data.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Fetched:', out.followers_count, 'followers,', out.posts.length, 'posts in last 8 days.');

execSync('git config user.email "etimichaeli01@gmail.com"');
execSync('git config user.name "mama-eti-ig-report bot"');
execSync('git add latest_data.json');
try {
  execSync('git commit -m "Weekly data pull"');
  execSync('git push');
  console.log('latest_data.json updated and pushed.');
} catch {
  console.log('Nothing changed since last pull, or push failed -- see logs above.');
}
