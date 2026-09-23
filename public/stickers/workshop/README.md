# Mystery images

Drop any `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif` file into this folder and it becomes
a picture in the "תמונת מסתורין" mosaic game **automatically** — no code change needed.

## How it works

`src/components/workshop/mysteryGallery.ts` reads this folder with Vite's
`import.meta.glob(..., { eager: true })`. Vite resolves the list at build time, so a new
file is bundled and appears in the game's rotation on the next dev-server reload or build.

## What happens when this folder is empty

The game falls back to ten stock village illustrations from `public./stickers/` (the
windmill, the workshops, the classroom, and so on), plus the three original hand-authored
SVG scenes. So the game always has pictures to show — this folder is for adding *your*
art, not for making the game work.

## Picture order

The game walks the pool as a **cycle**, not at random, so the image is guaranteed to change
on every new level and every restart:

    this folder (A→Z)  →  stock illustrations  →  built-in scenes  →  back to the start

Files in this folder are played first, sorted by file name. To control the order, prefix
the names — for example `01-bakery.jpg`, `02-orchard.jpg`.

## Titles

The file name becomes the title shown in the victory banner. `oil_press.jpg` is announced
as "Oil press"; underscores and hyphens become spaces, and the extension and Vite's
content hash are stripped.

## Sizing

Images are drawn with `object-cover` in a square frame, so any aspect ratio works without
distortion — a wide photo is cropped at the sides rather than squashed. A square image
around 600×600 shows the most detail per tile. Very large files are worth avoiding: every
image in the folder is bundled into the app.
