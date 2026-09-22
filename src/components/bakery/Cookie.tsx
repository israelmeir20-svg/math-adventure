/**
 * A single chocolate-chip cookie drawn with CSS only (no image assets).
 */

interface CookieProps {
  /** Loose cookies are bigger; packed ones shrink to fit a box. */
  size?: 'tray' | 'packed';
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

export default function Cookie({
  size = 'tray',
  onClick,
  disabled = false,
  label,
}: CookieProps) {
  const dimension = size === 'tray' ? 'h-10 w-10' : 'h-5 w-5';
  const chip = size === 'tray' ? 'h-1.5 w-1.5' : 'h-1 w-1';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label ?? 'עוגייה'}
      className={`relative shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_3px_0_#92400e] transition active:translate-y-[2px] active:shadow-none disabled:active:translate-y-0 ${dimension} ${
        onClick ? 'hover:scale-110 hover:brightness-110' : 'cursor-default'
      }`}
    >
      <span className={`absolute left-[26%] top-[24%] rounded-full bg-amber-900 ${chip}`} />
      <span className={`absolute right-[24%] top-[42%] rounded-full bg-amber-900 ${chip}`} />
      <span className={`absolute bottom-[24%] left-[42%] rounded-full bg-amber-900 ${chip}`} />
    </button>
  );
}
