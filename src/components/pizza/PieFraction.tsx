/**
 * The mini-pie fraction diagram for stage 1 of "פיצריית השברים".
 *
 * A FRACTION IS A SHAPE BEFORE IT IS A SYMBOL. A child meeting "2/4" for the
 * first time cannot get anything out of the numerals alone: the idea being taught
 * is that the bottom number says how many equal pieces the whole was cut into and
 * the top says how many of them we mean. Drawing that next to the text is what
 * makes the notation readable, so the diagram is not decoration - it IS the
 * instruction at this stage, and it is withdrawn at stage 2 precisely because the
 * child should by then be reading the numerals.
 *
 * THE SHADED WEDGES ARE COUNTED, NOT COMPUTED. `filled` arrives as a wedge count
 * and the circle is cut into `total` equal parts, so the picture and the pie the
 * child is topping can never disagree by a rounding error.
 *
 * Inline `<svg>` rather than a `<div>` inside the stage's canvas: this renders in
 * HTML next to the fraction chip, where it is an ordinary element.
 */
interface PieFractionProps {
  /** How many wedges are shaded. */
  filled: number;
  /** How many equal wedges the whole is cut into. */
  total: number;
  /** Rendered size in px; the caller scales it to its row. */
  size?: number;
}

const R = 20;
const C = 22;

export default function PieFraction({ filled, total, size = 30 }: PieFractionProps) {
  const step = (Math.PI * 2) / total;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      className="shrink-0"
    >
      {Array.from({ length: total }, (_, index) => {
        // Swept from the top, clockwise, exactly like the pie on the board.
        const start = -Math.PI / 2 + index * step;
        const end = start + step;
        const x1 = C + R * Math.cos(start);
        const y1 = C + R * Math.sin(start);
        const x2 = C + R * Math.cos(end);
        const y2 = C + R * Math.sin(end);
        const largeArc = step > Math.PI ? 1 : 0;
        const shaded = index < filled;
        return (
          <path
            key={index}
            d={`M${C} ${C} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
            fill={shaded ? '#f97316' : '#fef3c7'}
            stroke="#b45309"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}
