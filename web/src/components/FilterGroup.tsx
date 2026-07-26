interface Option {
  value: string;
  count: number;
  /** Tint for values that carry meaning, e.g. Deceased. */
  tone?: string;
}

interface FilterGroupProps {
  title: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Long facets scroll instead of pushing everything else off screen. */
  scroll?: boolean;
}

/**
 * A facet block. Every option carries its live count, taken from the response
 * — there is no hardcoded list of affiliations anywhere in the app.
 */
export const FilterGroup = ({
  title,
  options,
  selected,
  onToggle,
  scroll = false,
}: FilterGroupProps) => {
  if (options.length === 0) return null;

  // min-w-0 overrides the UA `min-inline-size: min-content` on fieldset, which
  // otherwise refuses to shrink into the rail and forces a scrollbar.
  return (
    <fieldset className="min-w-0 border-t border-hairline pt-4">
      <legend className="label pr-3">{title}</legend>
      <div
        className={`flex flex-col ${scroll ? "max-h-64 overflow-x-hidden overflow-y-auto pr-1" : ""}`}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="group flex cursor-pointer items-center gap-2.5 py-1.5"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="size-3.5 shrink-0 appearance-none border border-hairline bg-iron checked:border-brass checked:bg-brass"
            />
            <span
              className={`flex-1 truncate text-meta ${option.tone ?? "text-bone"} group-hover:text-brass`}
              title={option.value}
            >
              {option.value}
            </span>
            <span className="datum shrink-0 text-label text-bone-dim">
              {option.count}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
