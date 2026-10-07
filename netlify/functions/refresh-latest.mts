/**
 * Hourly check that keeps the homepage's "The Latest" in sync with YouTube.
 *
 * Runs the same slot picking the build uses (src/lib/youtube.ts), then looks
 * for each picked video on the live homepage. Only when one is missing does it
 * POST to the Netlify build hook, so a deploy happens once per new upload
 * instead of on a timer.
 *
 * Setup (Netlify UI, once): Project configuration → Build & deploy → Build
 * hooks → add one for `main`, then save its URL as the BUILD_HOOK_URL
 * environment variable. Without it the check only logs what it would do.
 */
import { fetchFeedPicks } from '../../src/lib/youtube';

export default async () => {
  const picks = await fetchFeedPicks(3);
  if (picks.length === 0) {
    console.warn('[refresh-latest] Every YouTube feed failed; skipping this run');
    return;
  }

  const siteUrl = process.env.URL ?? 'https://behindthesigns.com';
  const res = await fetch(siteUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.warn(`[refresh-latest] ${siteUrl}: HTTP ${res.status}; skipping this run`);
    return;
  }
  const html = await res.text();

  const missing = picks.filter((v) => !html.includes(`watch?v=${v.id}`));
  if (missing.length === 0) {
    console.log('[refresh-latest] Homepage is current');
    return;
  }

  const titles = missing.map((v) => `${v.id} (${v.title})`).join(', ');
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) {
    console.warn(`[refresh-latest] Not live yet: ${titles}. BUILD_HOOK_URL is not set, so no rebuild`);
    return;
  }

  const build = await fetch(`${hook}?trigger_title=${encodeURIComponent('New YouTube video')}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  });
  console.log(`[refresh-latest] Not live yet: ${titles}. Build hook → HTTP ${build.status}`);
};

export const config = { schedule: '@hourly' };
