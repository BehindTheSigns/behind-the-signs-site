/**
 * Build-time YouTube data for the landing page.
 *
 * Pulls the most recent videos across the two curated playlists (Podcast +
 * Shop Tours) from YouTube's public RSS feeds — no API key required. This
 * runs during `astro build`, so every Netlify deploy refreshes the list.
 * If YouTube is unreachable the SNAPSHOT below keeps the build green.
 */

export interface LatestVideo {
  id: string;
  title: string;
  published: Date;
  source: 'podcast' | 'shop-tours';
}

const PLAYLISTS: Array<{ id: string; source: LatestVideo['source'] }> = [
  { id: 'PLWFiBORpfpiAlcKW7w-zNKCetpwtm1ckk', source: 'podcast' },
  { id: 'PLWFiBORpfpiB1tOaQVYl2_9JO0PXCT3xg', source: 'shop-tours' },
];

/** Last known-good data (2026-07-26), used only when the feeds fail. */
const SNAPSHOT: LatestVideo[] = [
  {
    id: 'rk5BBUAMr4k',
    title: 'Why This 45-Year-Old Sign Company Sold All Its Equipment',
    published: new Date('2026-07-21'),
    source: 'podcast',
  },
  {
    id: '8cKlk1p01TU',
    title: 'Kong Screen Printing Shop Tour: From a $60K Press to a $200K Line',
    published: new Date('2026-07-07'),
    source: 'shop-tours',
  },
  {
    id: 'nx6FW4WUjSM',
    title: "Why Sign Shops Can't Find Good Employees — And What's Finally Changing",
    published: new Date('2026-06-24'),
    source: 'podcast',
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

async function fetchPlaylist(
  playlistId: string,
  source: LatestVideo['source'],
): Promise<LatestVideo[]> {
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
      return { id, title: decodeEntities(title), published: new Date(published), source };
    })
    .filter((v): v is LatestVideo => v !== null);
}

export async function fetchLatestVideos(count = 3): Promise<LatestVideo[]> {
  try {
    const feeds = await Promise.all(PLAYLISTS.map((p) => fetchPlaylist(p.id, p.source)));
    const seen = new Set<string>();
    const videos = feeds
      .flat()
      .sort((a, b) => b.published.valueOf() - a.published.valueOf())
      .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
    if (videos.length === 0) throw new Error('feeds returned no entries');
    return videos.slice(0, count);
  } catch (err) {
    console.warn(
      `[youtube] Falling back to snapshot data: ${err instanceof Error ? err.message : err}`,
    );
    return SNAPSHOT.slice(0, count);
  }
}
