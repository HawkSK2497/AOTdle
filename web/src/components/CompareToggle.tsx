interface CompareToggleProps {
  name: string;
  heightCm: number | null;
  selected: boolean;
  /** The ruler is full and this record is not on it. */
  full: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Adds a record to the height ruler.
 *
 * Unavailable states stay focusable and carry their reason rather than being
 * `disabled` and silently unreachable — "no recorded height" is information.
 */
export const CompareToggle = ({
  name,
  heightCm,
  selected,
  full,
  onToggle,
  className = "",
}: CompareToggleProps) => {
  const noHeight = heightCm === null;
  const blocked = noHeight || (full && !selected);

  const reason = noHeight
    ? `No recorded height for ${name}`
    : `Height comparison is full — remove a record before adding ${name}`;

  const label = selected
    ? `Remove ${name} from the height comparison`
    : `Add ${name} to the height comparison`;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={blocked || undefined}
      aria-label={blocked ? reason : label}
      title={blocked ? reason : label}
      onClick={blocked ? undefined : onToggle}
      className={`grid size-7 place-items-center border font-mono text-meta transition-colors ${
        selected
          ? "border-brass bg-brass text-iron"
          : blocked
            ? "border-hairline bg-iron/80 text-bone-dim/40"
            : "border-hairline bg-iron/80 text-bone-dim hover:border-brass hover:text-brass"
      } ${className}`}
    >
      <span aria-hidden="true">{noHeight ? "–" : selected ? "✓" : "+"}</span>
    </button>
  );
};
