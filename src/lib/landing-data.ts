import type { ImageMetadata } from 'astro';
import sponsorsJson from '../data/sponsors.json';
import associationsJson from '../data/associations.json';

// The landing page's sponsor and association lists are edited through Pages CMS
// (src/data/*.json). Logos are stored as repo paths so the CMS can manage them,
// then resolved here back to imported assets so <Image> optimization still applies.
//
// Nothing here may fail the build: a CMS save can include an empty row ("add
// item" clicked, then saved), which is dropped, and any other entry renders
// with whatever it has (a missing or deleted logo just means no logo).
const logos = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/landing/*.{png,jpg,jpeg,svg,webp}',
  { eager: true }
);

type Entry = { name?: string; logo?: string; href?: string; blurb?: string; featured?: boolean };

function clean(items: Entry[]) {
  return items
    .filter((e) => e && Object.values(e).some((v) => (typeof v === 'string' ? v.trim() !== '' : v)))
    .map((e) => {
      const path = e.logo ? (e.logo.startsWith('/') ? e.logo : `/${e.logo}`) : '';
      return {
        name: e.name?.trim() ?? '',
        href: e.href?.trim() || undefined,
        blurb: e.blurb?.trim() ?? '',
        featured: e.featured === true,
        logo: logos[path]?.default as ImageMetadata | undefined,
      };
    });
}

export const sponsors = clean(sponsorsJson.sponsors as Entry[]);

export const associations = clean(associationsJson.associations as Entry[]);
