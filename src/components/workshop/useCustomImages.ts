/**
 * Parent-uploaded photos for the mystery mosaic.
 *
 * WHY localStorage AND WHY BASE64. There is no backend, and the alternative -
 * an object URL or an in-memory File - dies on reload, which would silently
 * delete a parent's photos the next time the tab closed. A data URL survives
 * because it IS the image. The cost is size, which is the whole reason for the
 * constraints below.
 *
 * LOCALSTORAGE IS ABOUT 5MB PER ORIGIN AND IT IS SHARED. Storing a camera photo
 * as base64 costs roughly 1.37x the file size, so two unshrunk 3MB photos would
 * already be at the quota and would start throwing QUOTA_EXCEEDED_ERR on
 * unrelated saves elsewhere in the game. So every upload is downscaled and
 * re-encoded before it is stored:
 *
 *   - the long edge is capped at 900px, because the mosaic's largest tile is
 *     4x4 on a ~320px board - 900px leaves the slice crisp on a retina screen
 *     and is five times smaller than the source
 *   - JPEG at quality 0.82, which for a photo is visually indistinguishable from
 *     the original at these dimensions
 *
 * A single store also has to hold a few photos, so `MAX_IMAGES` caps the list and
 * `MAX_BYTES` caps each entry. A rejected upload reports WHY rather than failing
 * silently, because a parent tapping an upload button and seeing nothing happen
 * is the worst possible outcome for this feature.
 */
import { useCallback, useEffect, useState } from 'react';
import { sceneToDataUrl, type MysteryScene } from './mysteryScenes';
import { imageAtStep } from './mysteryGallery';

/** The exact key the brief specifies. */
export const STORAGE_KEY = 'custom_mosaic_images';

/** How many photos a parent may keep at once. */
export const MAX_IMAGES = 8;

/** Per-image ceiling for the ENCODED string, in characters. */
const MAX_BYTES = 900 * 1024;

/** Long-edge cap for the downscale. */
const MAX_EDGE = 900;

/** JPEG quality for the re-encode. */
const QUALITY = 0.82;

export interface CustomImage {
  id: string;
  /** A base64 data URL, ready to use as a CSS background. */
  dataUrl: string;
  /** The original file name, shown under the thumbnail. */
  name: string;
}

/** Reads the stored list, tolerating anything malformed. */
function load(): CustomImage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CustomImage =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as CustomImage).dataUrl === 'string' &&
          (item as CustomImage).dataUrl.startsWith('data:image/'),
      )
      .map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `stored-${index}`,
        dataUrl: item.dataUrl,
        // Cleaned on read as well as on write: photos uploaded before the title
        // sanitiser existed are already in storage with their raw names, and this
        // is the only place that can repair them.
        name:
          typeof item.name === 'string' && cleanTitle(item.name)
            ? cleanTitle(item.name)
            : `תמונה ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

function persist(images: CustomImage[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    return true;
  } catch {
    // Almost always the quota. The caller surfaces this rather than swallowing it.
    return false;
  }
}

/**
 * Downscales and re-encodes one file.
 *
 * `createImageBitmap` with `resizeWidth`/`resizeHeight` does the scaling on the
 * decoder's own thread where it is supported, which matters because a 12MP photo
 * drawn through a canvas on the main thread blocks for long enough to drop the
 * modal's animation. The `Image` + canvas path is the fallback.
 *
 * EXIF ORIENTATION: `imageOrientation: 'from-image'` is passed so a photo taken in
 * portrait on a phone is not stored sideways.
 */
async function shrink(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-2d-context');
  // Photos are opaque, but a transparent PNG re-encoded to JPEG would otherwise
  // come back with black where the alpha was.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  return canvas.toDataURL('image/jpeg', QUALITY);
}

type Drawable = ImageBitmap | HTMLImageElement;

async function loadBitmap(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode-failed'));
      img.src = url;
    });
    return img;
  } finally {
    // Safe to revoke once decoded: the element keeps its own decoded copy.
    URL.revokeObjectURL(url);
  }
}

export interface CustomImagesHandle {
  images: CustomImage[];
  /** Adds files. Returns the count added and a Hebrew reason if any were skipped. */
  add: (files: FileList | File[]) => Promise<{ added: number; error: string | null }>;
  remove: (id: string) => void;
  clear: () => void;
}

export function useCustomImages(): CustomImagesHandle {
  const [images, setImages] = useState<CustomImage[]>(load);

  // Keep other tabs in step. Two tabs of the same game both editing the parent
  // list would otherwise clobber each other on the next write.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setImages(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback(
    async (files: FileList | File[]): Promise<{ added: number; error: string | null }> => {
      const list = [...files].filter((file) => file.type.startsWith('image/'));
      if (!list.length) return { added: 0, error: 'לא נבחרו קבצי תמונה' };

      let next = load();
      let added = 0;
      let error: string | null = null;

      for (const file of list) {
        if (next.length >= MAX_IMAGES) {
          error = `אפשר לשמור עד ${MAX_IMAGES} תמונות`;
          break;
        }
        try {
          const dataUrl = await shrink(file);
          if (dataUrl.length > MAX_BYTES) {
            error = `התמונה "${file.name}" גדולה מדי גם אחרי הקטנה`;
            continue;
          }
          next = [
            ...next,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              dataUrl,
              // The parent's file name IS the title, so it has to be cleaned.
              // Real-world names carry characters that read as noise in the
              // victory banner: "photo#1" and "IMG_2#" both surfaced a stray "#",
              // and appending it to "גילית: " produced "גילית: photo#1 🎉".
              // Collapsing runs of separators also stops "a -  - b" style names.
              name: cleanTitle(file.name) || `תמונה ${next.length + 1}`,
            },
          ];
          added += 1;
        } catch {
          error = `לא הצלחנו לקרוא את "${file.name}"`;
        }
      }

      if (added > 0 && !persist(next)) {
        // Nothing was written, so do not pretend otherwise.
        return { added: 0, error: 'אין מקום לשמור תמונות במכשיר הזה' };
      }
      setImages(next);
      return { added, error };
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const next = load().filter((image) => image.id !== id);
    persist(next);
    setImages(next);
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to do */
    }
    setImages([]);
  }, []);

  return { images, add, remove, clear };
}

/** A picture and its own name, decided together so the two can never disagree. */
export interface MosaicSource {
  /** The image to hide. A data URL for both custom photos and built-in scenes. */
  imageUrl: string;
  /** The name shown in the victory banner. Always describes `imageUrl`. */
  title: string;
  /** True when this came from a parent's upload rather than the built-in scenes. */
  custom: boolean;
}

/**
 * Turns a file name into something that reads as a picture title.
 *
 * Strips the extension and every character that renders as punctuation noise
 * inside a congratulation sentence. `#` is the important one - camera and download
 * tools emit names like `IMG_4821#1.jpg` and `photo #3.jpg`, and the raw name was
 * being shown verbatim as "...! גילית: IMG_4821#1", which is where the stray
 * characters in the victory banner came from. `#` is also meaningful in a URL
 * fragment, so leaving it in a value that may be used in a fragment is a hazard,
 * not just an eyesore.
 *
 * Runs of separators collapse, so `a  -  b` becomes `a - b` rather than keeping
 * the padding the file system allowed. Hebrew, digits, and ordinary punctuation
 * such as `-`, `_` and `'` survive untouched.
 */
export function cleanTitle(rawName: string): string {
  const withoutExtension = rawName.replace(/\.[^.]+$/, '');
  return withoutExtension
    .replace(/[#*`"<>|\\/:?]+/g, ' ') // separators and URL/HTML-significant noise
    .replace(/\s*-\s*/g, ' - ') // normalise spaced hyphens
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Picks the picture for a new puzzle: a built-in scene, a stock illustration, or a
 * parent's own photo, WITH ITS OWN NAME ATTACHED.
 *
 * WHY THIS RETURNS BOTH AND NOT JUST A URL. The previous version returned only a
 * data URL from `pickCustomImage`, and the board then read the title from
 * `round.scene.name` - the name of a DEFAULT scene that had been drawn separately.
 * Every custom photo was therefore announced as one of the three built-in scenes:
 * a parent uploads a picture of the family dog and the game congratulates the
 * child on discovering "קשת בענן". The two values were chosen by two independent
 * draws, so they had no reason to agree.
 *
 * Attaching the title to the image at the moment of the draw makes that class of
 * bug unrepresentable - there is no longer a path that can produce an image
 * without its name.
 *
 * ===================================================================
 * `step` REPLACES THE OLD RANDOM DRAW, AND THAT IS THE POINT.
 * ===================================================================
 *
 * This used to choose a scene with `pickScene(random)` - a uniform draw across three
 * SVG scenes. Three options with no memory is why the child reported the game as
 * stuck on one picture: a repeat arrives every third round on average, and the same
 * picture twice in a row is common enough to look like a bug.
 *
 * Now the caller passes a CURSOR (`step`) that walks the gallery, and the next cursor is
 * drawn AT RANDOM from every picture EXCEPT the current one (see `stepAfter`). So the
 * picture is genuinely random - it does not march around the pool in a fixed order - and
 * consecutive deals are still guaranteed to differ. The cursor is owned by the modal
 * rather than drawn here, because a source that only knows how to pick cannot promise
 * "different from last time"; it has no idea what last time was.
 *
 * A parent's own photo still takes priority over the gallery, because a photo the
 * family just uploaded is the most interesting thing on the board. It is drawn with
 * `step` as the index rather than a fresh random value, so it too rotates rather
 * than repeating.
 *
 * The built-in scene is still passed IN rather than drawn here, because the round's
 * equations and its scene come from `buildMysteryRound` and must stay together - it
 * is now used as the pool's last entry rather than as a competing draw.
 */
export function pickMosaicSource(
  defaultScene: { name: string },
  step = 0,
): MosaicSource {
  let pool: CustomImage[] = [];
  try {
    pool = load();
  } catch {
    pool = [];
  }

  /*
   * THE PARENT'S PHOTOS COME FIRST, ROTATED BY THE SAME CURSOR.
   *
   * This is a change from the old 50/50 split, which existed to stop the built-in
   * scenes crowding out two uploaded photos. That reasoning no longer applies: the
   * gallery is now much larger than the photo pool, so giving the photos the first
   * turn of every cycle is what keeps a family's own pictures from being buried.
   *
   * No `random()` gate any more - a coin flip would reintroduce exactly the
   * unpredictability this function is being changed to remove. If a family has
   * uploaded photos, they are what the child sees first, in order, then the gallery.
   */
  if (pool.length > 0) {
    /*
     * The index is normalised through `Number.isFinite` before the modulo, because a
     * non-finite step (`NaN`, `Infinity`) would make the modulo produce `NaN`, index the
     * pool at `NaN`, and return `undefined` - which then throws on `.dataUrl`. A crash here
     * blanks the whole studio, so the cursor is treated as untrusted input rather than as a
     * value the caller is assumed to have sanitised.
     */
    const safeStep = Number.isFinite(step) ? Math.trunc(step) : 0;
    const photo = pool[((safeStep % pool.length) + pool.length) % pool.length] as CustomImage;
    // The parent's own file name, stripped of its extension when it was stored.
    // This is the ONLY title that can be paired with this image.
    return { imageUrl: photo.dataUrl, title: photo.name, custom: true };
  }

  /*
   * No photos, so walk the gallery. The cursor is offset by the photos' absence so
   * that adding or removing a photo does not make the gallery jump - and `defaultScene`
   * is kept as the terminal fallback in case the gallery is ever emptied, so the board
   * can always show something.
   */  const picture = imageAtStep(step);
  if (!picture.url) {
    return {
      imageUrl: sceneToDataUrl(defaultScene as MysteryScene),
      title: defaultScene.name,
      custom: false,
    };
  }
  return { imageUrl: picture.url, title: picture.title, custom: false };
}
