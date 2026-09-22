/**
 * One hot-air balloon, drawn from the island's own artwork with the digit laid on it.
 *
 * ================================================================================================
 * THE ASSET HAS TO BE CROPPED, AND THIS IS THE REASON THIS COMPONENT EXISTS AT ALL
 * ================================================================================================
 *
 * `src/assets/island/balloon.png` is a 2816x1536 PNG, but the balloon itself occupies only a 927x1376
 * region - measured from the alpha channel, not guessed. The rest of the canvas is fully transparent
 * padding, and it is not symmetric: the balloon sits at the horizontal centre but the file's aspect is
 * a wide 1.83:1 while the balloon's own is a portrait ~0.67:1.
 *
 * That padding is the whole problem. Dropping the PNG into a box with `object-contain` makes the
 * RENDERED BALLOON about 66% of the width it was given, because the browser fits the transparent
 * canvas, not the art inside it. Two consequences, both bad here:
 *
 *   1. The size comparison breaks. This game asks which balloon is physically LARGER, and if the art
 *      is scaled to fit a padded canvas then a "large" box and an "xl" box can render the same visible
 *      balloon - the answer becomes unreadable, which is fatal for the one judgement being tested.
 *   2. Phones lose most of the screen. A portrait phone gets a balloon a third the width of its slot.
 *
 * SO THE CROP IS DONE IN CSS, WITH A KNOWN RATIO. Instead of fitting the canvas, the image is scaled
 * to a fixed factor and offset so that ONLY the balloon's bounding box lands inside the frame. The
 * numbers are derived from the measured bbox rather than tuned by eye:
 *
 *   balloon bbox    927 x 1376   (alpha-derived)
 *   canvas          2816 x 1536
 *   scale factor    2816 / 927  = 3.037  -> the balloon fills the width when scaled 3.037x
 *   visible height  1376 * 3.037 = 4179px, so the frame's height/width ratio must be 1376/927 = 1.484
 *
 * The frame is therefore a box with `aspect-ratio: 927 / 1376` (0.674) whose child is the image at
 * width 303.7% - the reciprocal of the balloon's share of the canvas (927/2816 = 32.9%) - translated so
 * the bbox centre meets the frame centre. Everything here is a ratio, so it stays exact at any size.
 *
 * WHY NOT JUST PRE-CROP THE FILE. Because the asset is shared: `balloon_screen.png`, `sky.png` and the
 * tower art all come from the same island set, and a build step that rewrote one of them would be a
 * surprise for the next person to open the folder. Cropping at the point of use keeps the artwork
 * pristine and puts the measurement next to the code that depends on it.
 */
import balloonSprite from '../../assets/island/balloon.png';

interface BalloonArtProps {
  /** The digit printed in the middle of the envelope. */
  digit: number;
  /** Adds a soft green halo, used to confirm a correct pick. */
  hit?: boolean;
  /** Adds a red wobble, used to mark a wrong pick. */
  miss?: boolean;
  /**
   * True when the task is about SIZE, so the digit must not dominate the envelope.
   *
   * THE DIGIT IS DELIBERATELY SMALLER ON A SIZE TASK. The whole exercise is to make the player ignore
   * the numbers, and a huge white numeral is the single most salient thing that could be drawn on the
   * balloon - it would actively fight the task. Shrinking it (and dropping its weight slightly) means
   * the size cue wins the eye, while the digit is still legible for the value task. The value task
   * wants the opposite, so the digit is scaled up.
   */
  emphasizeDigit: boolean;
}

/**
 * The balloon's share of its own canvas, measured from the alpha channel.
 *
 * These are NOT magic numbers chosen to look right - they are the padded canvas's dimensions and the
 * balloon's bounding box inside it. If the artwork is ever re-exported tighter, these five constants
 * are the only thing that needs re-measuring, and the derivation below recomputes the rest.
 */
const CANVAS_W = 2816;
const CANVAS_H = 1536;
const BBOX_X = 949;
const BBOX_Y = 92;
const BBOX_W = 927;
const BBOX_H = 1376;

/**
 * How much to blow the image up so the bbox exactly fills the frame's width.
 *
 * `2816 / 927 = 3.038`. The image therefore renders at 303.8% of the frame's width, and everything
 * outside the bbox is pushed out of the frame by the offsets below.
 */
const ZOOM = CANVAS_W / BBOX_W;
/** Aspect ratio of the visible balloon, for the frame's `aspect-ratio`. */
const FRAME_ASPECT = `${BBOX_W} / ${BBOX_H}`;

/*
 * THE OFFSETS, DERIVED RATHER THAN TUNED.
 *
 * THE TRAP HERE IS WHICH BOX A `translate()` PERCENTAGE RESOLVES AGAINST. A percentage in `translate`
 * is relative to the ELEMENT'S OWN border box - the image, 303.8% wide - and NOT to the frame it sits
 * in. Writing the correction as "the fraction of the frame I need to move" is therefore wrong by a
 * factor of `ZOOM`, and the error is subtle: the balloon lands slightly off-centre and looks like an
 * art problem rather than an arithmetic one.
 *
 * Derivation, all in "frame units" where the frame is 100 wide:
 *   s          = (100 * ZOOM) / CANVAS_W        frame units per canvas pixel
 *   bboxLeft   = BBOX_X * s                     where the balloon starts inside the image
 *   bboxWidth  = BBOX_W * s                     which is exactly 100 by construction of ZOOM
 *
 * The image is placed with `left: 50%; top: 50%`, then translated by `-50% + tx` of its OWN size, so
 * its left edge sits at `50 - IW/2 + (tx/100)*IW`. Requiring the balloon's left edge to land on the
 * frame's x=0 gives `tx` directly; the vertical case is identical with the frame's own height.
 *
 * The magnitudes are small - under 1% - precisely BECAUSE the balloon is already close to centred in
 * its canvas. The crop is doing almost all the work through `ZOOM` and `aspect-ratio`; these two
 * numbers only remove the last few pixels of asymmetry.
 */
const IW = 100 * ZOOM;
const IH = IW * (CANVAS_H / CANVAS_W);
const FH = 100 * (BBOX_H / BBOX_W);
/** Frame units per canvas pixel. */
const S = IW / CANVAS_W;
const OFFSET_X_PCT = ((-100 / 2 + IW / 2 - BBOX_X * S) / IW) * 100;
const OFFSET_Y_PCT = ((-FH / 2 + IH / 2 - BBOX_Y * S) / IH) * 100;

export default function BalloonArt({ digit, hit = false, miss = false, emphasizeDigit }: BalloonArtProps) {
  return (
    <span
      className={`relative block ${
        hit ? 'motion-safe:animate-[balloonPop_.3s_ease-out]' : ''
      } ${miss ? 'motion-safe:animate-[wobble_.35s_ease-in-out]' : ''}`}
      style={{ aspectRatio: FRAME_ASPECT, width: '100%' }}
    >
      <img
        src={balloonSprite}
        alt=""
        aria-hidden
        draggable={false}
        /*
          `max-w-none` IS LOAD-BEARING. Tailwind's preflight sets `max-width: 100%` on images, which
          would clamp this 303.8%-wide image back down to the frame's width and undo the entire crop.
          `absolute` + the derived offset is what places the balloon's bbox inside the frame.
        */
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: `${ZOOM * 100}%`,
          height: 'auto',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${OFFSET_X_PCT}%), calc(-50% + ${OFFSET_Y_PCT}%))`,
        }}
      />

      {/*
        THE DIGIT SITS AT ~38% OF THE FRAME'S HEIGHT, NOT ITS CENTRE.

        The bbox includes the basket and ropes, so the frame's geometric centre lands near the bottom of
        the envelope - printing the digit there would put it on the ropes. 38% from the top is the
        middle of the envelope itself, which is where a registration mark belongs on a real balloon.
      */}
      <span
        className="pointer-events-none absolute inset-x-0 flex items-center justify-center text-white"
        style={{ top: '38%', transform: 'translateY(-50%)' }}
      >
        <span
          className="font-black tabular-nums"
          style={{
            fontSize: emphasizeDigit ? '2.4rem' : '1.75rem',
            lineHeight: 1,
            opacity: emphasizeDigit ? 1 : 0.85,
            textShadow: '0 2px 4px rgba(15,23,42,0.55), 0 0 12px rgba(15,23,42,0.35)',
          }}
        >
          {digit}
        </span>
      </span>
    </span>
  );
}
