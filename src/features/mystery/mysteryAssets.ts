/**
 * Resolves asset filenames from the case data to usable URLs.
 *
 * ================================================================================================
 * WHY THIS IS ITS OWN MODULE
 * ================================================================================================
 *
 * Every station names its art in the case data rather than importing it, so a case can be added by
 * dropping a file into the folder and naming it. That lookup was first written inside
 * `station1Geometry.ts`, which made it station 1's - and station 3 needs the same lookup for a
 * different set of files (signposts, nets, puddles, burrows). Sharing it means one glob and one set
 * of rules for how a missing file degrades, rather than three copies that drift.
 *
 * ================================================================================================
 * ONE GLOB FOR EVERYTHING, RESOLVED BY FILENAME
 * ================================================================================================
 *
 * `import.meta.glob` RATHER THAN A STATIC IMPORT PER ASSET. The filename lives in the data, so a
 * case should light up by naming its art rather than by editing an import block. That is the same
 * reasoning `caseData.ts` uses for suspect badges.
 *
 * EAGER, NOT LAZY, AND THAT IS DELIBERATE. A lazy glob resolves to promises, which would make these
 * functions async and force every puzzle to render a placeholder for a frame while its art
 * arrived. For a background that would be a size-changing swap underneath a positioned overlay,
 * which is exactly the layout shift worth avoiding; for the chase's props it would mean nets and
 * signposts popping in mid-animation. The cost is that the mystery art is in the bundle, which is
 * acceptable for a set of images a child sees one case's worth of.
 *
 * The glob is keyed by full path (`../../assets/mystery/window.jpeg`) but the data carries only a
 * filename, so every lookup matches on the tail.
 */
const MYSTERY_ASSETS = import.meta.glob('../../assets/mystery/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * The URL for an asset by filename, or an empty string if it is not in the folder.
 *
 * RETURNS AN EMPTY STRING RATHER THAN THROWING, and callers treat that as "draw nothing" - a
 * missing prop degrades to a puzzle without that decoration rather than a blank screen in front of
 * a child. `hasAsset` is provided for the cases where the difference matters and a caller would
 * rather omit a whole element than draw an empty image.
 */
export function assetFor(filename: string): string {
  const match = Object.entries(MYSTERY_ASSETS).find(([path]) => path.endsWith(`/${filename}`));
  return match?.[1] ?? '';
}

/** Whether an asset exists, for callers that would rather skip an element than draw nothing. */
export function hasAsset(filename: string): boolean {
  return assetFor(filename) !== '';
}

/**
 * The URL for a case's background.
 *
 * A NAMED ALIAS RATHER THAN A SECOND GLOB. Both stations call it with `config.bgAsset`, and the
 * name documents at the call site that this is the backdrop the overlay is positioned against -
 * which is the one asset whose absence is worth noticing.
 */
export function backgroundFor(bgAsset: string): string {
  return assetFor(bgAsset);
}
