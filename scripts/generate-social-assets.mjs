// Generates the default social-share card and the Organization schema logo
// from the brand sources. Run manually after changing brand assets:
//   node scripts/generate-social-assets.mjs
// (Same approach as the favicon set - rendered with the site's own sharp.)
import sharp from 'sharp';

const TEAL = { r: 1, g: 139, b: 183 }; // surf-600 #018bb7, the hero wash color

// --- public/og-image.jpg - 1200x630 default share card ---------------------
const W = 1200, H = 630;
const photo = await sharp('src/assets/coming-soon/hero-bg.jpg')
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .toBuffer();
const wash = await sharp({
  create: { width: W, height: H, channels: 4, background: { ...TEAL, alpha: 0.55 } },
}).png().toBuffer();
const wordmark = await sharp('src/assets/coming-soon/wordmark.svg', { density: 300 })
  .resize({ width: 820 })
  .png()
  .toBuffer();
const wm = await sharp(wordmark).metadata();
await sharp(photo)
  .composite([
    { input: wash, top: 0, left: 0 },
    { input: wordmark, top: Math.round((H - wm.height) / 2), left: Math.round((W - wm.width) / 2) },
  ])
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile('public/og-image.jpg');

// --- public/logo.png - 512x512 square Organization logo --------------------
const mark = await sharp('src/assets/bts-sign-logo.svg', { density: 300 })
  .resize(440, 440, { fit: 'inside' })
  .png()
  .toBuffer();
const mk = await sharp(mark).metadata();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([{ input: mark, top: Math.round((512 - mk.height) / 2), left: Math.round((512 - mk.width) / 2) }])
  .png()
  .toFile('public/logo.png');

for (const f of ['public/og-image.jpg', 'public/logo.png']) {
  const m = await sharp(f).metadata();
  console.log(f, `${m.width}x${m.height}`, `${Math.round((await import('node:fs')).statSync(f).size / 1024)} KB`);
}
