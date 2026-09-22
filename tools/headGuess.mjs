/**
 * Finds the HEAD region of each sprite by looking for the darkest cluster in the
 * upper portion of the artwork - eyes and facial features read as dark pixels
 * against the lighter fur/feathers.
 *
 * This is a heuristic, not an oracle: it narrows the search so the calibration
 * image only needs a nudge rather than a from-scratch eyeballing.
 *
 * Run: node tools/headGuess.mjs
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';

const FILES = [
  ['duck', 'duck.png'],
  ['rabbit', 'rabbit.png'],
  ['cat', 'cat.png'],
  ['dog', 'dog.png'],
  ['sheep', 'sheep.png'],
  ['donkey', 'donkey.png'],
  ['cow', 'cow.png'],
  ['horse', 'horse.png'],
];

for (const [name, file] of FILES) {
  const img = await loadImage(`src/assets/farm/${file}`);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  // Artwork bounds first.
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y += 1)
    for (let x = 0; x < img.width; x += 1)
      if (data[(y * img.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

  // Search the top 40% of the artwork for the darkest 5% of pixels: eyes/nose.
  const artH = maxY - minY + 1;
  const searchBottom = minY + Math.round(artH * 0.4);
  const lum = [];
  for (let y = minY; y < searchBottom; y += 2)
    for (let x = minX; x <= maxX; x += 2) {
      const i = (y * img.width + x) * 4;
      const a = data[i + 3];
      if (a < 200) continue;
      // Rec.601 luma.
      lum.push([x, y, 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]]);
    }
  lum.sort((a, b) => a[2] - b[2]);
  const darkest = lum.slice(0, Math.max(1, Math.floor(lum.length * 0.05)));
  const avgX = darkest.reduce((s, p) => s + p[0], 0) / darkest.length;
  const avgY = darkest.reduce((s, p) => s + p[1], 0) / darkest.length;

  // Report as percentages of the IMAGE, which is the same space the SVG box maps
  // to under `xMidYBottom meet`.
  const pctX = ((avgX / img.width) * 100).toFixed(1);
  const pctY = ((avgY / img.height) * 100).toFixed(1);
  console.log(
    `${name.padEnd(8)} darkest-5% centroid at image%: x=${pctX} y=${pctY}   ` +
      `(art x ${(((minX) / img.width) * 100).toFixed(0)}..${((maxX / img.width) * 100).toFixed(0)}%)`,
  );
}
