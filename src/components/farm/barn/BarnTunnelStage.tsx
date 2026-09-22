/**
 * The barn stage: a CSS "sandwich" of three stacked layers.
 *
 * ===================================================================
 * THE STACK, IN PAINT ORDER.
 * ===================================================================
 *
 *   z-0   `newbarn.png`          the painted scene - sky, meadow, barn exterior.
 *   z-10  the actor lanes         the travelling animals, absolutely positioned.
 *   z-20  `barn-foreground.png`   the barn's front wall, drawn OVER the animals.
 *
 * THE ANIMALS SIT BETWEEN THE TWO IMAGES, AND THAT IS THE WHOLE TRICK. The
 * foreground art is the barn's front face with its doorway punched out as real
 * transparency, so an animal crossing the threshold is progressively covered by
 * the jambs and disappears INTO the building rather than being cut off by an
 * opaque rectangle at the barn's outer edge. Because the foreground is a single
 * RGBA image, the occlusion is produced by the artwork's own alpha rather than by
 * geometry the code has to keep in sync with the picture.
 *
 * ===================================================================
 * WHY THIS IS DOM + CSS RATHER THAN ONE SVG.
 * ===================================================================
 *
 * The previous version composed the scene in SVG: an `<image>` for the backdrop,
 * clip-pathed actor groups, and hand-built `<path>` barn walls. That worked, but
 * it meant the barn's silhouette existed TWICE - once in the artwork and once as
 * a clip path and facade geometry - and the two had to be kept aligned by hand.
 * Every tweak to the barn required re-deriving coordinates.
 *
 * Layering three elements removes that duplication entirely: the occlusion is a
 * property of the picture. The cost is that positions are now percentages rather
 * than viewBox units, so the geometry module supplies the fractions.
 *
 * ===================================================================
 * MOTION IS STILL A rAF CLOCK, AND STILL A PURE FUNCTION OF TIME.
 * ===================================================================
 *
 * Every actor's x is computed from `useStageClock` each frame and applied as an
 * inline percentage `left`. There is deliberately no CSS transition and no
 * SMIL:
 *
 *   - A CSS transition would need a duration per animal, and a late-mounting
 *     wave would visibly race to catch up.
 *   - SMIL runs on the DOCUMENT timeline, so a wave that mounts seconds after
 *     page load is treated as already expired and snaps to its end coordinate -
 *     the bug that once made exiting animals invisible.
 *
 * Computing from elapsed time instead means a wave that mounts late animates
 * EXACTLY like one that mounted on first paint.
 *
 * The parent keys this component on the round id, so each round gets a fresh
 * clock at zero and fresh actor nodes.
 */
import { ANIMAL_ASSETS, EASTER_EGG_ASSETS, SPRITE_PX } from './animalAssets';
import type { AnimalActor as Actor } from './barnRoundGenerator';
import { delayMs, waveMs } from './barnTiming';
import { useStageClock } from './useStageClock';
import {
  DIRECTION_FLIP,
  foregroundArt,
  laneTopPct,
  sceneArt,
  travelPct,
} from './stageGeometry';

export type StagePhase = 'RUNNING_IN' | 'RUNNING_OUT' | 'SLAMMING' | 'ANSWERING' | 'PARTY';

interface BarnTunnelStageProps {
  phase: StagePhase;
  incoming: Actor[];
  outgoing: Actor[];
}

export default function BarnTunnelStage({ phase, incoming, outgoing }: BarnTunnelStageProps) {
  const runningIn = phase === 'RUNNING_IN';
  const runningOut = phase === 'RUNNING_OUT';
  const party = phase === 'PARTY';

  /*
   * One clock per wave. The out-wave clock only starts when the wave does, so its
   * animals begin at the barn door and walk the full visible lane.
   *
   * The frozen durations are passed in so a wave that has already finished holds
   * its final frame rather than snapping back to the start: `useStageClock`
   * clamps at this value, so the last animal parks exactly at its end position.
   */
  const inFrozenMs = waveMs(incoming.length);
  const outFrozenMs = waveMs(outgoing.length);
  const inElapsed = useStageClock(runningIn, `in-${incoming.length}`, inFrozenMs);
  const outElapsed = useStageClock(runningOut, `out-${outgoing.length}`, outFrozenMs);

  /*
   * While a wave is not running its actors hold their final position: incoming
   * animals park inside the barn (hidden by the foreground art), outgoing ones
   * park past the far edge. Keeping them mounted avoids a mid-stride pop when the
   * wave's phase flips.
   */
  const renderWave = (actors: Actor[], direction: 'in' | 'out') => {
    const elapsed = direction === 'in' ? inElapsed : outElapsed;
    return actors.map((actor, index) => (
      <TravellingActor
        key={actor.id}
        actor={actor}
        direction={direction}
        index={index}
        leftPct={travelPct(index, elapsed, direction)}
        topPct={laneTopPct(index, elapsed, direction)}
        bobPhase={delayMs(index) / 1000}
        dancing={party}
      />
    ));
  };

  return (
    /*
     * A positioned box that fills whatever space the layout gives it. The three
     * children are absolutely stacked inside, so the box's own size never depends
     * on its contents - which is what stops the stage from pushing the keypad off
     * the bottom of the screen.
     */
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-sky-200"
      role="img"
      aria-label="אסם החווה עם חיות שנכנסות ויוצאות"
    >
      {/*
        THE SCENE FRAME.
        ------------------------------------------------------------------
        A fixed 16:9 box, centred in whatever space the stage was given.

        THIS IS WHAT KEEPS THE PERCENTAGES HONEST, and it is the subtlest thing in
        this file. Every constant in `stageGeometry` - the ground line, the barn's
        centre, the lane ends - was calibrated against the artwork's own 1.792
        aspect ratio. If the layers were stretched to fill an arbitrary box
        instead, the picture would be distorted AND those fractions would no
        longer point at the features they were measured from: the ground line would
        drift off the painted grass, and an animal told to park at the barn's
        centre would stop beside the barn instead of inside it.

        So the frame takes the artwork's ratio and is centred, which means the
        scene is never stretched and always means the same thing.

        THE TWO LENGTHS ARE BOTH MAXES, NOT SIZES, AND THE RATIO DOES THE WORK.
        A flex item with `aspect-ratio` but no definite size would collapse to its
        content - and its children are all absolutely positioned, so they
        contribute no height at all. Giving it `w-full` plus `max-h-full` makes the
        browser pick whichever of the two constraints binds: on a wide box the
        width fills and the ratio-derived height is capped by `max-h-full`; on a
        tall box the height caps and the ratio-derived width follows. Either way
        the scene keeps its 1.792 shape, and any leftover space becomes a letterbox
        margin showing the parent's sky tint.
      */}
      <div className="relative aspect-[1376/768] max-h-full w-full max-w-full shrink-0">
        {/* ---------------------------------------------------------------
            LAYER 1 (z-0) - THE SCENE.
            The painted backdrop: sky, meadow, barn body. It is the base of the
            sandwich and everything else is painted over it.
           --------------------------------------------------------------- */}
        <img
          src={sceneArt()}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
        />

        {/* ---------------------------------------------------------------
            LAYER 2 (z-10) - THE ANIMALS.
            Absolutely positioned inside this frame, one per actor, so an actor's
            `bottom` offset places its feet on the painted ground line.
           --------------------------------------------------------------- */}
        <div className="absolute inset-0 z-10">
          {/* Incoming: run rightward, from off-screen left into the barn. */}
          {renderWave(incoming, 'in')}
          {/* Outgoing: run rightward, emerging from the barn and off to the right. */}
          {renderWave(outgoing, 'out')}
        </div>

        {/* ---------------------------------------------------------------
            LAYER 3 (z-20) - THE BARN'S FRONT FACE.
            `pointer-events-none` so it never swallows a tap meant for the board.

            THIS LAYER IS WHAT HIDES THE HERD, AND IT IS NOW THE ONLY THING THAT
            DOES. Alpha-sampling the artwork shows the barn's body is SOLID from
            y=0.78 to y=0.84 across its whole footprint - there is no transparent
            doorway to see through - so an animal drawn under it is genuinely
            covered rather than merely dimmed. That solidity is the mechanic: the
            child cannot count what is inside, so they have to hold the running
            total in their head.

            ANIMALS ARRIVE AT A HEIGHT THIS IMAGE COVERS. An incoming animal used
            to stop at the lawn line (0.885), which is BELOW the barn's base, so its
            legs showed under the wall - and the fix at the time was an opaque
            "curtain" rectangle painted over the animals to plug the stripe. That
            rectangle spanned the barn's whole footprint, so it also painted over
            every animal running across the middle of the lawn, and the herd
            appeared to dissolve out of existence mid-stage.

            The curtain is gone. Instead the incoming lane RISES to the barn's base
            as the animal reaches the door (see `laneTopPct`), so it finishes on
            ground this image genuinely covers and no filler is needed. Nothing is
            drawn over the actors at any point, which is what guarantees an animal
            can never be partially erased while it is out on the lawn.
           --------------------------------------------------------------- */}
        <img
          src={foregroundArt()}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-cover"
        />
      </div>
    </div>
  );
}

/**
 * One animal travelling along its lane.
 *
 * SPLIT INTO TWO NESTED NODES SO NOTHING CAN CLOBBER ANYTHING ELSE:
 *
 *   outer div : the horizontal position (`left`, a live percentage per frame)
 *               and the horizontal flip. Never animated by CSS.
 *   inner div : ONLY the trot bob / dance, via CSS animation. Kept separate so an
 *               animation's transform cannot overwrite the flip, and the flip
 *               cannot cancel the animation.
 *
 * `translateX(-50%)` on the OUTER node centres the sprite on its percentage, so
 * the lane maths can treat `left` as "the animal's centre" and the wrapping art
 * never biases the animal to one side of its own position.
 */
function TravellingActor({
  actor,
  direction,
  index,
  leftPct,
  topPct,
  bobPhase,
  dancing,
}: {
  actor: Actor;
  direction: 'in' | 'out';
  index: number;
  leftPct: number;
  topPct: number;
  bobPhase: number;
  dancing: boolean;
}) {
  const asset = ANIMAL_ASSETS[actor.animal];
  /*
   * A SKIN SWAP, AND ONLY A SKIN SWAP. The Easter egg changes the `src` and
   * nothing else: `asset.heightClass`, `asset.aspect` and `asset.trot` all still
   * come from the REAL animal, which is what keeps an egg-sized penguin standing
   * as tall as the cow it is standing in for. The underlying `actor.animal` is
   * untouched, so the round's answer is unaffected.
   */
  const src = actor.easterEgg ? EASTER_EGG_ASSETS[actor.animal] : asset.src;
  const animation = dancing
    ? `animalDance ${Math.max(0.42, asset.trot * 0.42)}s ease-in-out ${bobPhase}s infinite`
    : `trotBob ${asset.trot}s ease-in-out ${bobPhase + index * 0.12}s infinite`;

  // Both waves travel rightward, but the flip is expressed as data so a lane that
  // ever runs the other way is a one-line change rather than a new branch.
  const flip = DIRECTION_FLIP[direction] ?? false;

  /*
   * VERTICAL POSITION IS A LIVE VALUE, NOT A CONSTANT.
   *
   * `topPct` is the actor's feet, read from the same clock as `leftPct` (see
   * `laneTopPct`). An incoming animal rises to the barn's base as it arrives so the
   * barn art alone can cover it; an outgoing one starts there and steps down onto
   * the lawn. Everything here is a `bottom` offset derived from that one number, so
   * there is no second vertical animation to keep in sync.
   */
  /*
   * THE SPRITE IS SIZED IN PIXELS, NOT BY A UTILITY CLASS, AND THAT IS THE FIX
   * FOR THE ANIMALS "SHRINKING" AS THEY RAN.
   *
   * A pixel width and height are computed ONCE from the artwork's own aspect ratio
   * and applied as inline `width`/`height`. The previous version used a Tailwind
   * `heightClass` (`h-20`) plus `w-auto object-contain`, which asks the browser to
   * derive the width from the layout box at paint time.
   *
   * That derivation is what broke. The actor sits inside an absolutely-positioned,
   * shrink-to-fit wrapper that also carries `translateX(-50%)`, and the wrapper's
   * width depends on its content while the content's width was being derived from
   * the wrapper. As `left` advanced the browser re-resolved that circular sizing,
   * the box narrowed, and `object-contain` dutifully scaled the artwork down inside
   * it - so an animal appeared to shrink steadily along its run and end as a speck.
   * Nothing in the code said "scale"; the shrink was an emergent property of
   * letting the width be recomputed against a moving box.
   *
   * AN INLINE PIXEL SIZE CANNOT BE RE-DERIVED. The box is fixed before layout, so
   * the wrapper has nothing left to negotiate with and the sprite measures the same
   * at x=0 as it does at x=1.3.
   *
   * `flex: '0 0 auto'` is the same idea defensively: if the wrapper is ever given a
   * flex context it must not be allowed to compress the sprite either.
   */
  const pxHeight = SPRITE_PX[asset.heightClass] ?? 64;
  const pxWidth = Math.round(pxHeight * asset.aspect);
  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: `${leftPct}%`, bottom: `${100 - topPct * 100}%` }}
    >
      {/*
        THE FLIP AND THE BOB LIVE ON SEPARATE NODES, AND THAT SEPARATION IS
        LOAD-BEARING.

        Both of them are `transform`, and a CSS animation's `transform` OVERRIDES
        an inline one on the same element. Putting the flip and the animation
        together would therefore mean the bob silently erased the mirror, and a
        left-facing lane would render its animals facing the wrong way with nothing
        in the code looking wrong. Splitting them means neither can clobber the
        other, whichever way either one changes.
      */}
      <div style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
        <div
          style={{
            animation,
            transformOrigin: 'center bottom',
            /*
             * AN EXPLICIT IDENTITY TRANSFORM IS SET HERE ON PURPOSE.
             *
             * The animation only ever translates on Y, but the `transform`
             * PROPERTY still rotates through the animation's keyframes. Declaring
             * the rest-state as a literal `translateY(0) scale(1)` means the
             * composited layer is created with a known scale, so there is no frame
             * in which the browser can decide the element is unscaled and re-raster
             * it at a different size mid-run.
             */
            transform: 'translateY(0) scale(1)',
            flex: '0 0 auto',
          }}
        >
          {/*
            The drop shadow is what plants the animal on the grass - without it the
            cut-out art floats, since the sprite's own contact shadow is baked at a
            different scale in the source files.
          */}
          <img
            src={src}
            alt={asset.label}
            width={pxWidth}
            height={pxHeight}
            style={{ width: pxWidth, height: pxHeight, flex: '0 0 auto', maxWidth: 'none' }}
            className="object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.28)]"
          />
        </div>
      </div>
    </div>
  );
}
