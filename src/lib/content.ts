import { getCollection } from 'astro:content';

// Drafts render in `astro dev` for local preview; `astro build` (Netlify) excludes them.
const includeDrafts = import.meta.env.DEV;

export const getPublishedPosts = () =>
  getCollection('blog', ({ data }) => includeDrafts || !data.draft);

export const getPublishedEpisodes = () =>
  getCollection('podcasts', ({ data }) => includeDrafts || !data.draft);
