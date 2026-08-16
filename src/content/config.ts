import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Behind the Signs'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.enum(['business-tips', 'technical-guides', 'industry-news', 'case-studies']),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const podcasts = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    episode: z.number(),
    pubDate: z.coerce.date(),
    youtubeId: z.string(),
    duration: z.string(),
    guest: z.string().optional(),
    topics: z.array(z.string()),
    keyTakeaways: z.array(z.string()),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, podcasts };