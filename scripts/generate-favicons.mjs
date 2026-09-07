// Renders the raster favicon set from Joe's favicon artwork (src/assets/favicon-source.svg,
// a 16x16-viewBox vector: pink disc with the outlined white "BEHIND THE SIGNS" wordmark).
// The same SVG is served verbatim as public/favicon.svg; copy it there too after a change.
// Run manually after the artwork changes:
//   node scripts/generate-favicons.mjs
// Outputs: public/favicon.ico (16/32/48, PNG-in-ICO) and public/apple-touch-icon.png (180px).
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'src/assets/favicon-source.svg';
// Rasterize the vector at the target size directly (density scales the 16px viewBox;
// 72dpi = 1 CSS px per viewBox unit).
const raster = (size) => sharp(SRC, { density: (72 * size) / 16 }).resize(size, size);

// --- public/favicon.ico ------------------------------------------------------
// ICO container holding PNG-compressed images (supported by every modern browser).
const ICO_SIZES = [16, 32, 48];
const pngs = await Promise.all(
  ICO_SIZES.map((size) =>
    raster(size).png({ compressionLevel: 9 }).toBuffer(),
  ),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(ICO_SIZES.length, 4);
const dir = Buffer.alloc(16 * ICO_SIZES.length);
let offset = header.length + dir.length;
ICO_SIZES.forEach((size, i) => {
  const e = i * 16;
  dir.writeUInt8(size === 256 ? 0 : size, e); // width
  dir.writeUInt8(size === 256 ? 0 : size, e + 1); // height
  dir.writeUInt8(0, e + 2); // palette
  dir.writeUInt8(0, e + 3); // reserved
  dir.writeUInt16LE(1, e + 4); // color planes
  dir.writeUInt16LE(32, e + 6); // bits per pixel
  dir.writeUInt32LE(pngs[i].length, e + 8);
  dir.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, dir, ...pngs]));

// --- public/apple-touch-icon.png - 180x180, opaque ---------------------------
// iOS fills transparency with black, so the disc sits on a white square with a
// little breathing room (iOS rounds the corners itself).
const TOUCH = 180;
const DISC = 156;
const disc = await raster(DISC).png().toBuffer();
await sharp({
  create: { width: TOUCH, height: TOUCH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([{ input: disc, top: (TOUCH - DISC) / 2, left: (TOUCH - DISC) / 2 }])
  .png({ compressionLevel: 9 })
  .toFile('public/apple-touch-icon.png');

console.log('wrote public/favicon.ico (16/32/48) and public/apple-touch-icon.png (180)');
