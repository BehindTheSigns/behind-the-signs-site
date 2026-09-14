import { getCollection } from 'astro:content';

// Drafts render in `astro dev` for local preview; `astro build` (Netlify) excludes them.
const includeDrafts = import.meta.env.DEV;

export const getPublishedPosts = () =>
  getCollection('blog', ({ data }) => includeDrafts || !data.draft);

export const getPublishedEpisodes = () =>
  getCollection('podcasts', ({ data }) => includeDrafts || !data.draft);

// Real articles start in 2026 (one long-form piece a month). Anything dated
// earlier is treated as a dev sample and kept off the public lists. Newest
// first; this is the one ordering used by the homepage and the /blog archive.
const ARTICLES_LIVE_FROM = new Date('2026-01-01');

export const getArticles = async () =>
  (await getPublishedPosts())
    .filter((post) => post.data.pubDate >= ARTICLES_LIVE_FROM)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
