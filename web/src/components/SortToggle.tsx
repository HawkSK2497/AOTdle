import type { SortKey } from "../lib/filters";

interface SortToggleProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  {
    key: "depth",
    label: "Record depth",
    hint: "Fullest records first — the archive kept most on the people it cared about",
  },
  { key: "name", label: "A–Z", hint: "Alphabetical by name" },
];

export const SortToggle = ({ value, onChange }: SortToggleProps) => (
  <div className="flex items-center gap-px border border-hairline bg-hairline">
    {OPTIONS.map((option) => (
      <button
        key={option.key}
        type="button"
        title={option.hint}
        aria-pressed={value === option.key}
        onClick={() => onChange(option.key)}
        className={`label px-3 py-2 transition-colors ${
          value === option.key
            ? "bg-brass text-iron"
            : "bg-slate text-bone-dim hover:text-brass"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
