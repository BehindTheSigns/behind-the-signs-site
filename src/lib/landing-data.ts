import { z } from 'astro/zod';
import type { ImageMetadata } from 'astro';
import sponsorsJson from '../data/sponsors.json';
import associationsJson from '../data/associations.json';

// The landing page's sponsor and association lists are edited through Pages CMS
// (src/data/*.json). Logos are stored as repo paths so the CMS can manage them,
// then resolved here back to imported assets so <Image> optimization still applies.
const logos = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/landing/*.{png,jpg,jpeg,svg,webp}',
  { eager: true }
);

function resolveLogo(path: string): ImageMetadata {
  const key = path.startsWith('/') ? path : `/${path}`;
  const mod = logos[key];
  if (!mod) {
    throw new Error(
      `Landing logo "${path}" not found in src/assets/landing. Known logos:\n${Object.keys(logos).join('\n')}`
    );
  }
  return mod.default;
}

const sponsorSchema = z.object({
  name: z.string().min(1),
  logo: z.string().min(1),
  href: z.string().url(),
  blurb: z.string().min(1),
});

const associationSchema = z.object({
  name: z.string().min(1),
  logo: z.string().min(1),
  href: z.string().url(),
  featured: z.boolean().default(false),
});

export const sponsors = z
  .array(sponsorSchema)
  .parse(sponsorsJson.sponsors)
  .map((s) => ({ ...s, logo: resolveLogo(s.logo) }));

export const associations = z
  .array(associationSchema)
  .parse(associationsJson.associations)
  .map((a) => ({ ...a, logo: resolveLogo(a.logo) }));
