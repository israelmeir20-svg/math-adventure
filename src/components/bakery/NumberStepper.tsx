/**
 * A tactile number stepper with large +/- targets, sized for touch.
 * Shared by the bakery packing mode for both quotient and remainder.
 */
import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}

export default function NumberStepper({
  icon,
  label,
  value,
  max,
  onChange,
}: NumberStepperProps) {
  const clamp = (next: number) => Math.max(0, Math.min(max, next));

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200/40 bg-amber-950/45 p-3 text-white shadow-xl backdrop-blur-md">
      <span className="flex items-center gap-1.5 text-xs font-black text-amber-100">
        {icon}
        {label}
      </span>

      <span className="flex items-center gap-2">
        <StepButton
          label={`הפחת ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus className="h-5 w-5" strokeWidth={3} />
        </StepButton>

        <span className="w-10 text-center text-2xl font-black tabular-nums drop-shadow">
          {value}
        </span>

        <StepButton
          label={`הוסף ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
        </StepButton>
      </span>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-900 shadow-[0_4px_0_#b45309] transition hover:brightness-105 active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:active:translate-y-0"
    >
      {children}
    </button>
  );
}
