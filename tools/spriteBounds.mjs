/**
 * Measures the actual drawn bounds of each sprite.
 *
 * The eye offsets are percentages of the sprite BOX, but `preserveAspectRatio`
 * letterboxes the artwork inside that box - so the animal does not fill the box,
 * and a percentage of the box is not a percentage of the animal. This dumps the
 * real pixel bounds of the non-transparent artwork and the head region, so the
 * offsets can be derived from measurement rather than guessed.
 *
 * Run: node tools/spriteBounds.mjs
 */
import { readdirSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const DIR = 'src/assets/farm';

const files = readdirSync(DIR).filter((f) => f.endsWith('.png'));
for (const file of files.sort()) {
  const img = await loadImage(`${DIR}/${file}`);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const alpha = data[(y * img.width + x) * 4 + 3];
      if (alpha > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  // Percentages of the FULL IMAGE, which is what a percentage offset against the
  // letterboxed box needs to become.
  const pct = (v, total) => ((v / total) * 100).toFixed(1);
  console.log(
    `${file.padEnd(12)} img=${img.width}x${img.height}  art=[${minX},${minY} ${w}x${h}]  ` +
      `artPct x:${pct(minX, img.width)}..${pct(maxX, img.width)}  y:${pct(minY, img.height)}..${pct(maxY, img.height)}`,
  );
}
