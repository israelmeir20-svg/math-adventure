/**
 * A crate, in the two places one appears: the warehouse shelf and the truck bed.
 *
 * WHY ONE COMPONENT AND NOT TWO. The child learns a crate's identity from its SHELF
 * appearance and then has to recognise it as the same object after it has moved onto
 * the truck. If the shelf drew a crate one way and the bed drew it another, the two
 * would read as different objects and the child would have to re-identify every load.
 * Sharing the renderer makes "this is the crate I just picked up" automatic.
 *
 * The artwork itself lives in `CargoArt`, chosen by weight. This component's job is the
 * interaction and the labelling around it.
 */
import { CargoSvg } from './CargoArt';
import type { Crate } from './truckRounds';

interface CrateFaceProps {
  crate: Crate;
  /**
   * The crate's interaction. Omitted for the shelf's disabled/loaded state, where the
   * crate stays visible but is no longer a control.
   */
  onPress?: () => void;
  disabled?: boolean;
  /** Dims the crate once it has been moved to the truck. */
  faded?: boolean;
  /** Shrinks the illustration for the truck bed, where a full load must fit. */
  compact?: boolean;
}

export default function CrateFace({
  crate,
  onPress,
  disabled = false,
  faded = false,
  compact = false,
}: CrateFaceProps) {
  const interactive = Boolean(onPress) && !disabled;

  /*
   * THE LABEL CARRIES THE WEIGHT IN WORDS, and it has to.
   *
   * The illustration is `aria-hidden`, because a screen reader announcing three nested
   * SVG path elements per crate is noise. That makes this label the ONLY accessible
   * description of the crate, so it states the weight explicitly - which is also what
   * keeps the game playable without sight of the artwork.
   */
  const label = `העמיסו ארגז במשקל ${crate.weight} קילו`;

  const art = (
    <span className={faded ? 'opacity-35 grayscale' : undefined}>
      <CargoSvg weight={crate.weight} compact={compact} />
    </span>
  );

  if (!interactive) {
    return (
      <span
        className="flex shrink-0 flex-col items-center justify-end"
        aria-label={faded ? undefined : label}
        aria-hidden={faded || undefined}
      >
        {art}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      /*
       * `cursor-pointer` and the press feedback live on the button rather than the SVG,
       * so the whole crate including its transparent margins is one target - a 44px tap
       * area even for the smallest sack.
       */
      className="flex shrink-0 cursor-pointer flex-col items-center justify-end rounded-lg transition-transform duration-150 active:translate-y-0.5"
    >
      {art}
    </button>
  );
}
