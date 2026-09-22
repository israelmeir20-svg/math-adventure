/**
 * Geometry + motion constants for the Animal Scales canvas.
 *
 * ===================================================================
 * THE STAGE IS NOW A CSS COMPOSITION OVER A PAINTED BACKDROP.
 * ===================================================================
 *
 * This file used to hold SVG coordinates: a post drawn from (400,340) up to a pivot
 * at (400,140), a beam from one rounded rect, and pan anchors at x=180 and x=620.
 * All of that is gone. The scale is three painted PNGs layered in the DOM, so what
 * remains here is the geometry of the ASSEMBLY, expressed as percentages of the scene
 * box rather than as absolute SVG units.
 *
 * Percentages are the point: the artwork is fixed, so a layer's place in the scene is
 * a fixed fraction of the scene regardless of how large the scene is drawn. Absolute
 * units would need re-deriving at every breakpoint.
 *
 * ===================================================================
 * EVERY COORDINATE BELOW IS DERIVED FROM THE ALPHA CHANNEL OF THE ART.
 * ===================================================================
 *
 * The assets give no metadata, so the numbers were measured from each image's opaque
 * bounding box. That is what makes the pivot exact rather than eyeballed, and an
 * exact pivot is not cosmetic here: the beam must turn about the pillar's pin or the
 * two visibly detach at every tilt. See `scaleArt.ts` for the measurements.
 */

/** The scene's aspect ratio, matching the painted backdrop exactly (16:9). */
export const VIEW_ASPECT = 2752 / 1536;

/** The pivot: where the beam turns, as a fraction of the scene. */
export const PIVOT_X_PCT = 49.5;
/**
 * The pivot's height, as a fraction of the assembly.
 *
 * ===================================================================
 * THIS NUMBER IS SOLVED, NOT CHOSEN, AND IT REPLACED A BROKEN VALUE.
 * ===================================================================
 *
 * `PIVOT_Y` is the single lever that decides where the entire scale sits vertically,
 * because the beam turns about it and everything else hangs from the beam. It was 30,
 * which was simply wrong: at 30 the pedestal's foot came to rest at 60% of the
 * assembly, so the stand visibly FLOATED 40% of the assembly above the lawn with the
 * pans hanging in mid-air above it.
 *
 * It cannot be nudge-corrected, because two constraints pull against each other:
 *
 *   - the pedestal's foot must reach the bottom of the assembly (or the stand floats);
 *   - the pan's artwork and its weight badge must stay inside the assembly (or they are
 *     clipped by the scene's `overflow-hidden`).
 *
 * Both are driven by this one value, so it has to satisfy them simultaneously. Working
 * them through with the measured art fractions (`base.png`'s opaque span ends at 77.7%
 * of its own box; the pan's badge sits at 86% of the pan):
 *
 *   PIVOT_Y = 30  ->  foot at  60%, pan bottom at 54%   stand floats 40%
 *   PIVOT_Y = 52  ->  foot at  82%, pan bottom at 99%   pans just clear
 *   PIVOT_Y = 68  ->  foot at  98%, pan bottom at 115%  PAN CLIPPED at full tilt
 *
 * ===================================================================
 * WHY 68 WAS WRONG: IT IGNORED THE TILT.
 * ===================================================================
 *
 * The table above originally said "68 is the largest value that keeps everything in
 * frame", and that was only true of a LEVEL beam. It measured the pans hanging straight
 * down and never asked where they go when the scale actually tips - which is most of the
 * time, because the game is about imbalance.
 *
 * A pan's anchor falls by `arm * sin(theta)` when its side goes down. The right pan hangs
 * 75.9% of the beam from the pivot, so at the maximum 18 degree tilt its anchor drops
 * 23.4% - and at PIVOT_Y = 68 that put the pan's bottom at 115% of the assembly. The
 * scene clips its own overflow, so the heavier pan was cut off by the frame at exactly the
 * moment the child needed to count the animals on it.
 *
 * 52 is the largest value that keeps the LOWEST pan inside the assembly at full tilt. The
 * cost is that the pedestal's foot only reaches 82% of the assembly, so the stand no
 * longer grounds itself - which is why the assembly's own offset (`bottom: 16px`) and
 * height are what place it on the grass. Splitting the job this way is the point: the
 * pivot decides where the PANS can swing, and the container decides where the STAND lands.
 */
export const PIVOT_Y_PCT = 52;

/** The beam's rendered width, as a fraction of the scene width. */
export const BEAM_W_PCT = 82;
/** The beam's rendered height, as a fraction of the scene height. */
export const BEAM_H_PCT = 14;

/**
 * How far along the beam the pans hang, as a fraction of the BEAM's own width.
 *
 * `rod.png`'s opaque span runs x=5.6%..94.6% of its canvas, so its painted ends are
 * inset from its box edges. The hooks sit just inside those ends, which is where a
 * real balance's cords would be tied.
 */
export const PAN_HANG_FRAC = 0.075;

/**
 * A pan's rendered width, as a fraction of the scene width.
 *
 * ===================================================================
 * ENLARGED FROM 19% TO 24%, BECAUSE THE TRAY IS THE BINDING CONSTRAINT.
 * ===================================================================
 *
 * The pan's width decides how much room three animals have, and 19% was simply not
 * enough: at the modal's 768px ceiling it gave a usable floor of about 105px, while
 * three legible animal sprites need more than that. Every attempt to fix the overflow
 * by shrinking the sprites made them illegible instead, which is the wrong trade - a
 * six-frame animation nobody can see is worse than a slightly larger basket.
 *
 * At 24% the tray's usable floor is roughly 133px at the ceiling, which fits three
 * horses with headroom, and the pan still clears the pillar and stays inside the frame
 * (verified in `check-tray`).
 *
 * THE BEAM WAS LEFT ALONE. Widening the beam to match would have pushed the pans past
 * the scene edge, and the beam is already at 82% - there is no room for both. Keeping
 * the beam fixed and letting the pans overhang its ends slightly is also what a real
 * balance looks like: the pan hangs BELOW the cord, not inside the beam's span.
 */
export const PAN_W_PCT = 24;
/**
 * A pan's rendered height, as a fraction of the scene height.
 *
 * Raised with the width so the pan's own aspect ratio stays roughly square - a basket
 * that got wide but not taller would read as a shallow dish, and the animals would have
 * no depth to stand in.
 */
export const PAN_H_PCT = 34;

/** The base's rendered width, as a fraction of the scene width. */
export const BASE_W_PCT = 30;
/** The base's rendered height, as a fraction of the scene height. */
export const BASE_H_PCT = 46;

/** Shared easing for the beam, the cords and the counter-rotation. */
export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * The beam's transition.
 *
 * A slight overshoot curve, so the beam settles with a little weight rather than
 * gliding to a stop - the `1.56` control point is what makes it read as a physical
 * balance swinging into place.
 */
export const BEAM_TRANSITION_MS = 600;
export const BEAM_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** The counter-rotation shares the beam's timing exactly, or the pans would lag. */
export const TILT_MS = BEAM_TRANSITION_MS;

/** Fill for the glow drawn behind the beam once the pans balance. */
export const BALANCE_GLOW = '#4ade80';

/** Degrees of tilt per unit of imbalance. */
export const DEGREES_PER_UNIT = 4;

/**
 * Maximum tilt.
 *
 * Raised from 16 to the specified 18. At 18 the beam is unmistakably tipped without
 * the higher pan's cords crossing the pillar, which is the point at which the
 * illusion breaks and it starts to read as a seesaw.
 */
export const MAX_TILT = 18;

/**
 * Imbalance (in units) at which the lighter pan's animals are flung upward.
 * Below this the tilt alone tells the story; at or above it we add the hop so a
 * big mistake is funny rather than discouraging.
 */
export const FLING_THRESHOLD = 4;

/** How many animals fit on one pan. */
export const PAN_CAPACITY = 3;

/**
 * How long the solved, green-glowing beam is held before the next puzzle is dealt.
 *
 * This value has now moved in both directions, and the two constraints that bracket it
 * are worth stating together because they are the reason it cannot simply be "snappy":
 *
 *   - LOWER BOUND: it must stay above `BEAM_TRANSITION_MS` (600ms). The beam is still
 *     swinging towards level for that long, so a shorter hold swaps the puzzle out
 *     mid-swing and the tidiest moment in the game - the flat, glowing beam - is never
 *     actually seen. That is what the original 650ms got wrong.
 *
 *   - UPPER BOUND: past roughly a second the gap stops reading as a celebration and
 *     starts reading as a stall, especially with a 15-second clock running, where 1.5s
 *     of every solved round is more than a tenth of the whole run spent frozen.
 *
 * 750ms sits just above the beam's own settle time: long enough that the beam is visibly
 * flat and the chime has landed, short enough that the next puzzle arrives while the
 * child is still enjoying the last one. The clock is paused for exactly this window (see
 * `AnimalScaleGame`'s celebration effect), so the hold costs the player no thinking time -
 * but it does cost wall clock, which is why it is kept tight.
 */
export const SOLVED_HOLD_MS = 750;

/**
 * The animal sprite box's base WIDTH, as a percent of the scene width.
 *
 * ===================================================================
 * WHY THIS IS A PERCENTAGE AFTER ALL, DESPITE THE TIDIER PIXEL VERSION.
 * ===================================================================
 *
 * A pixel budget was tried first, because it makes "how big is a horse on screen" a
 * single readable number. It does not survive contact with the pan's own geometry: the
 * pan is a fixed fraction of the scene, so at the modal's narrow widths the tray's floor
 * is only a few dozen pixels across. A fixed pixel size is correct at exactly ONE scene
 * width, and the modal varies from a phone to its 768px ceiling.
 *
 * A percentage keeps the animals PROPORTIONAL to the pan at every width, which is the
 * property that matters: the cluster's width and the tray's width then scale by the same
 * factor, so what fits at 400px fits at 768px.
 *
 * The species `scale` factor still multiplies this, so the relative sizes are unchanged
 * - a duck is visibly smaller than a horse at every width.
 *
 * NOTE THE UNITS. This percentage is resolved ONCE, in JavaScript, against the scene's
 * measured pixel width - never in CSS against a percentage-sized ancestor. That
 * distinction is the whole reason it is safe to use a percentage here: the earlier `0x0`
 * sprite bug came from a CSS percentage whose containing block was itself percentage
 * sized, which can resolve to zero and render an invisible element with no error.
 */
export const PAN_ANIMAL_BASE_PCT = 5.2;

/**
 * The ceiling on a sprite's BOX, in pixels, for a standard animal.
 *
 * A flat number rather than a per-aspect clamp: dividing the limit by each animal's artwork
 * aspect made the cap depend on which sprite it applied to, so tall-cropped species were
 * squeezed far below the size the tray could hold. This bounds the box, which is what has to
 * fit a huddle of three.
 */
export const MAX_TRAY_ANIMAL_PX = 72;

/**
 * The higher ceiling that applies to the curled lamb (`sheep2`) alone.
 *
 * Its canvas is mostly transparent margin, so the box has to be well above the standard one
 * before the DRAWN animal matches its neighbours. Keeping this separate is what lets the
 * rest of the cast sit at a natural scale instead of being inflated to suit one sprite.
 */
export const CURLED_SHEEP_MAX_PX = 95;

/**
 * The floor on a sprite's width, so it can never collapse.
 *
 * This exists ONLY to guard the failure this game already hit once, where a sprite
 * resolved to a `0x0` box and rendered completely invisibly with nothing logged.
 * `PAN_ANIMAL_BASE_PCT` is resolved against the scene's measured width, and a measurement
 * of zero (a hidden parent, a pre-layout first paint) would multiply through to zero.
 *
 * IT IS DELIBERATELY VERY LOW, and that is a change from 26px. A floor that is high enough
 * to be a useful aesthetic minimum FLATTENS THE WHOLE SIZE HIERARCHY: the clamp binds at a
 * different scene width for each species - 366px for the donkey but 694px for the duck -
 * so on any window narrower than about 700px the small animals are held up at the floor
 * while the large ones keep shrinking, and the cast ends up equal-sized or even inverted.
 * A duck as big as a horse destroys the cue the game is teaching.
 *
 * At 12px the clamp only ever engages when the scene has essentially collapsed, which is
 * exactly the case it is there for, and the cast stays correctly ordered at every width
 * the game can actually be played at.
 */
export const PAN_ANIMAL_MIN_PX = 12;

/**
 * The overlap between neighbouring animals in a tray, in pixels.
 *
 * The "cute huddle" look. CSS rejects a negative `gap`, so this is applied as a
 * negative `margin-left` on every animal after the first - which overlaps their
 * bounding boxes while leaving flexbox's centring and ordering untouched.
 */
export const PAN_CLUSTER_GAP_PX = 5;

/**
 * Above this many animals the whole cluster is scaled down, so it cannot spill over
 * the basket's rim.
 *
 * The pan's capacity is `PAN_CAPACITY`, but the cast is not uniform: three horses is a
 * very different amount of animal than three ducks, and at full size the horses hang
 * out over the rim in mid-air.
 */
export const PAN_SPILL_THRESHOLD = 2;

/** How much the cluster shrinks when it exceeds `PAN_SPILL_THRESHOLD`. */
export const PAN_SPILL_SCALE = 0.85;
