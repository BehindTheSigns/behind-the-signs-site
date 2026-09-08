/**
 * Build-time YouTube data for the landing page's "The Latest" section.
 *
 * Reads two curated playlists from YouTube's public RSS feeds (no API key)
 * during `astro build`, so every Netlify deploy refreshes the list. If
 * YouTube is unreachable the SNAPSHOT below keeps the build green.
 *
 * Slot rules (Daniel, 2026-09-08):
 *   1. newest video in the Shop Tours playlist
 *   2. newest video in the "Sign Shop Owners & Industry Pros" playlist
 *   3. the newest video left over from either playlist
 * A video that appears in both playlists is only shown once.
 */

export interface LatestVideo {
  id: string;
  title: string;
  published: Date;
  source: 'shop-tours' | 'industry-pros';
}

const PLAYLISTS: Record<LatestVideo['source'], string> = {
  'shop-tours': 'PLWFiBORpfpiB1tOaQVYl2_9JO0PXCT3xg',
  'industry-pros': 'PLWFiBORpfpiAGtgYr544uRc4K8UBeXGGR',
};

/** One fixed slot per playlist, in landing-page order; remaining slots are filled by date. */
const SLOT_ORDER: LatestVideo['source'][] = ['shop-tours', 'industry-pros'];

/** Last known-good result (2026-09-08), used only when the feeds fail. */
const SNAPSHOT: LatestVideo[] = [
  {
    id: 'p__QYZPG1r0',
    title: 'Behind the Signs: The Dream It, Build It Moment',
    published: new Date('2026-08-17'),
    source: 'shop-tours',
  },
  {
    id: 'nmlCiAm_cnk',
    title: 'Why Water Jet Cutting Is Worth the Investment!',
    published: new Date('2026-09-08'),
    source: 'industry-pros',
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

export async function fetchLatestVideos(count = 3): Promise<LatestVideo[]> {
  try {
    const sources = Object.keys(PLAYLISTS) as LatestVideo['source'][];
    const feeds = Object.fromEntries(
      await Promise.all(sources.map(async (s) => [s, await fetchPlaylist(s)] as const)),
    ) as Record<LatestVideo['source'], LatestVideo[]>;

    const picked: LatestVideo[] = [];
    const seen = new Set<string>();
    const take = (v: LatestVideo | undefined) => {
      if (v && !seen.has(v.id) && picked.length < count) {
        seen.add(v.id);
        picked.push(v);
      }
    };

    // Fixed slots first, one per playlist in landing-page order.
    for (const source of SLOT_ORDER) take(feeds[source].find((v) => !seen.has(v.id)));
    // Then the newest of whatever is left, from either playlist.
    for (const v of Object.values(feeds).flat().sort(byNewest)) take(v);

    if (picked.length === 0) throw new Error('feeds returned no entries');
    return picked;
  } catch (err) {
    console.warn(
      `[youtube] Falling back to snapshot data: ${err instanceof Error ? err.message : err}`,
    );
    return SNAPSHOT.slice(0, count);
  }
}
