/**
 * A floating pin for a standalone mini-game anchor.
 *
 * Deliberately styled apart from the district pins: smaller, rounder and
 * gradient-filled, so a child can tell at a glance that this opens a quick game
 * rather than a whole district. Carries a gentle idle bob and a scale-up on
 * hover; the pin button itself is the hitbox.
 */
import { assetFor } from '../../features/mystery/mysteryAssets';
import type { GameAnchor } from './gameAnchors';

interface GameAnchorPinProps {
  anchor: GameAnchor;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: GameAnchor['id']) => void;
  /**
   * Called instead of `onOpen` when the anchor is closed, so the caller can raise the notice.
   *
   * The pin does not render the toast itself. A toast belongs to the map (it has to survive the pin
   * losing hover, and there must only ever be one of them), and anchoring it here would tie its
   * lifetime to a button the child may have already moved away from.
   */
  onClosedNotice: (notice: string) => void;
}

export default function GameAnchorPin({
  anchor,
  isHovered,
  onHover,
  onOpen,
  onClosedNotice,
}: GameAnchorPinProps) {
  /*
   * AN ANCHOR MAY CARRY A DRAWN BADGE INSTEAD OF ITS EMOJI.
   *
   * The detective office's magnifying glass is a real asset in the mystery folder, and using it
   * here rather than the 🔍 emoji makes the pin and the feature it opens visually identical - the
   * child taps the same symbol they then see in the office's header. Tinting it through the same
   * gradient disc keeps it consistent with the emoji anchors beside it, and colouring it white
   * with a drop shadow is what makes one flat drawing read on every gradient in `ANCHOR_TONES`.
   *
   * `assetFor` returns an empty string for a missing file, and in that case this falls back to the
   * emoji rather than rendering an empty image - so a renamed asset degrades to the old pin look
   * instead of a blank bubble with no icon at all.
   */
  const badgeSrc = anchor.badgeAsset ? assetFor(anchor.badgeAsset) : '';
  /** True when this anchor is pinned to the map but not enterable. */
  const closed = Boolean(anchor.closedNoticeHebrew);

  return (
    <button
      type="button"
      onClick={() => (closed ? onClosedNotice(anchor.closedNoticeHebrew!) : onOpen(anchor.id))}
      onMouseEnter={() => onHover(anchor.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(anchor.id)}
      onBlur={() => onHover(null)}
      /*
       * THE CLOSED PIN IS STILL A REAL BUTTON, NOT A DISABLED ONE.
       *
       * `disabled` would suppress the click entirely, so the child would get no feedback at all and
       * would reasonably conclude the map was broken. Keeping it live and answering the tap with a
       * notice is the whole point of the closed state - the pin has to be able to explain itself.
       * `aria-disabled` conveys "this does not do the obvious thing" to a screen reader without
       * taking the button out of the tab order or blocking the message.
       */
      aria-disabled={closed || undefined}
      aria-label={
        closed
          ? `${anchor.labelHebrew} - ${anchor.closedNoticeHebrew}`
          : `${anchor.labelHebrew} - ${anchor.blurbHebrew}`
      }
      style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition duration-200 ${
        isHovered ? 'scale-110' : ''
      }`}
    >
      {/*
        A CLOSED PIN IS VISUALLY DRAINED, NOT HIDDEN. The gradient disc and the white bubble are
        desaturated and dimmed so the pin reads as dormant next to its live neighbours, while the
        label stays fully legible - a child who cannot read the text would otherwise have no way to
        tell this pin apart from the four that work.
      */}
      <span
        className={`relative flex items-center gap-1.5 rounded-full border-2 py-0.5 pe-2.5 ps-0.5 shadow-lg ${
          closed ? 'border-stone-300 bg-stone-200/95' : 'border-white bg-white/95'
        }`}
      >
        <span
          aria-hidden
          className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-base ${anchor.tone} ${
            closed ? 'opacity-40 grayscale' : ''
          }`}
        >
          {badgeSrc ? (
            <img
              src={badgeSrc}
              alt=""
              draggable={false}
              /* Sized inside the disc and knocked out white, so a dark drawing stays legible on
                 every gradient in the anchor set. */
              className="h-5 w-5 brightness-0 invert drop-shadow"
            />
          ) : (
            anchor.emoji
          )}
        </span>
        <span
          className={`whitespace-nowrap text-[11px] font-black ${
            closed ? 'text-stone-500' : 'text-stone-700'
          }`}
        >
          {/* The closed pin swaps its subtitle for the notice, so the reason is on the map itself
              and does not depend on the child having tapped it first. */}
          {closed ? anchor.closedNoticeHebrew : anchor.blurbHebrew}
        </span>

        {/* A padlock beside the drained disc, because a dimmed colour alone is a weak signal for a
            child who has not yet learned what the other pins look like when they work. */}
        {closed && (
          <span aria-hidden className="-ms-0.5 text-[11px] leading-none">
            🔒
          </span>
        )}
      </span>

      {/* Pointer tail, so the pin visibly belongs to the spot beneath it. */}
      <span
        aria-hidden
        className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b-2 border-e-2 ${
          closed ? 'border-stone-300 bg-stone-200/95' : 'border-white bg-white/95'
        }`}
      />

      {/* Idle sparkle, drawn from the shared keyframe set. Suppressed when closed: a twinkling
          "come and tap me" aura on a pin that will not open is a false promise. */}
      {!closed && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 animate-[sparkle_2.6s_ease-in-out_infinite] rounded-full bg-amber-200/35"
        />
      )}
    </button>
  );
}
