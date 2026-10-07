/**
 * Build-time YouTube data for the landing page's "The Latest" section.
 *
 * Reads three curated playlists from YouTube's public RSS feeds (no API key)
 * during `astro build`, so every Netlify deploy refreshes the list. If
 * YouTube is unreachable the SNAPSHOT below keeps the build green.
 * New uploads trigger a deploy on their own: the hourly scheduled function
 * `netlify/functions/refresh-latest.mts` compares these picks with the live
 * homepage and calls the Netlify build hook when they differ.
 *
 * Slot rules (Daniel + Joe, 2026-09-10) — one slot per playlist, in order:
 *   1. newest video in "Behind The Signs Guest Interviews"
 *   2. newest video in "Sign Industry Topics & Trends"
 *   3. newest video in "Behind the Signs Shop Tours"
 * A video that appears in more than one playlist is shown once. If a playlist
 * is empty or unreachable, its slot is filled by the newest leftover video
 * from the other playlists so the section never shows a gap.
 */

export interface LatestVideo {
  id: string;
  title: string;
  published: Date;
  source: 'interviews' | 'topics' | 'shop-tours';
}

/** Landing-page slot order = key order. */
const PLAYLISTS: Record<LatestVideo['source'], string> = {
  interviews: 'PLWFiBORpfpiAlcKW7w-zNKCetpwtm1ckk',
  topics: 'PLWFiBORpfpiCuvmldX1ipkrVfk7ofRTzd',
  'shop-tours': 'PLWFiBORpfpiB1tOaQVYl2_9JO0PXCT3xg',
};

/** Last known-good result (2026-09-10), used only when every feed fails. */
const SNAPSHOT: LatestVideo[] = [
  {
    id: 'DRu9xUCggVk',
    title: 'Where to Start With AI in Your Sign Shop (Without Losing What Makes You Good)',
    published: new Date('2026-08-26'),
    source: 'interviews',
  },
  {
    id: 'Sx9MCX7B378',
    title: 'Where imposter syndrome actually comes from...self belief!',
    published: new Date('2026-08-11'),
    source: 'topics',
  },
  {
    id: 'njLnI_WBqD0',
    title: 'How Steel Art Built a 72-Year Legacy: Join us for the full Behind The Signs Shop Tour',
    published: new Date('2026-08-13'),
    source: 'shop-tours',
  },
];

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Shorts often carry a trail of "#hashtags" in the title; drop them for the card. */
function cleanTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(/(\s*#[\p{L}\p{N}_-]+)+\s*$/u, '')
    .trim();
}

const byNewest = (a: LatestVideo, b: LatestVideo) => b.published.valueOf() - a.published.valueOf();

async function fetchPlaylist(source: LatestVideo['source']): Promise<LatestVideo[]> {
  const playlistId = PLAYLISTS[source];
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`YouTube feed ${playlistId}: HTTP ${res.status}`);
  const xml = await res.text();

  // The feeds are flat Atom XML; a regex scan keeps the build dependency-free.
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, entry]) => {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      if (!id || !title || !published) return null;
      return { id, title: cleanTitle(title), published: new Date(published), source };
    })
    .filter((v): v is LatestVideo => v !== null)
    .sort(byNewest);
}

/** One playlist failing (deleted, renamed, offline) must not blank the section. */
async function fetchPlaylistOrEmpty(source: LatestVideo['source']): Promise<LatestVideo[]> {
  try {
    return await fetchPlaylist(source);
  } catch (err) {
    console.warn(`[youtube] ${source}: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/**
 * The slot picks straight from the feeds, without the snapshot fallback
 * (empty if every feed failed). Shared with the scheduled
 * `netlify/functions/refresh-latest` check so both agree on what "current" is.
 */
export async function fetchFeedPicks(count = 3): Promise<LatestVideo[]> {
  const sources = Object.keys(PLAYLISTS) as LatestVideo['source'][];
  const feeds = await Promise.all(sources.map(fetchPlaylistOrEmpty));

  const picked: LatestVideo[] = [];
  const seen = new Set<string>();
  const take = (v: LatestVideo | undefined) => {
    if (v && !seen.has(v.id) && picked.length < count) {
      seen.add(v.id);
      picked.push(v);
    }
  };

  // One fixed slot per playlist, in landing-page order.
  for (const feed of feeds) take(feed.find((v) => !seen.has(v.id)));
  // Any slot still open (playlist missing/empty) takes the newest leftover.
  for (const v of feeds.flat().sort(byNewest)) take(v);
  return picked;
}

export async function fetchLatestVideos(count = 3): Promise<LatestVideo[]> {
  const picked = await fetchFeedPicks(count);
  if (picked.length === 0) {
    console.warn('[youtube] Every feed failed; falling back to snapshot data');
    return SNAPSHOT.slice(0, count);
  }
  return picked;
}
