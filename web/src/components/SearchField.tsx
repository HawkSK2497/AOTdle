interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchField = ({ value, onChange }: SearchFieldProps) => (
  <div className="flex flex-1 items-center gap-3 border border-hairline bg-slate px-3 py-2 focus-within:border-brass">
    <label htmlFor="archive-search" className="label shrink-0">
      Search
    </label>
    <input
      id="archive-search"
      type="search"
      value={value}
      autoComplete="off"
      placeholder="Name"
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 flex-1 bg-transparent text-body text-bone outline-none placeholder:text-bone-dim/50 [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className="label shrink-0 text-bone-dim transition-colors hover:text-brass"
      >
        Clear
      </button>
    )}
  </div>
);
