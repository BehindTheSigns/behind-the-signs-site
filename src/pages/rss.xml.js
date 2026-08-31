import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/content';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: 'Behind the Signs',
    description:
      'Real conversations with the people shaping the sign industry, behind-the-scenes Shop Tours, and one long-form article a month.',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/blog/${post.slug}/`,
      })),
  });
}
