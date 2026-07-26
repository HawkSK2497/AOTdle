interface GridEmptyProps {
  onClear: () => void;
}

export const GridEmpty = ({ onClear }: GridEmptyProps) => (
  <div className="hatch flex flex-col items-center gap-4 border border-hairline px-6 py-20 text-center">
    <p className="font-cond text-record text-bone">No records match</p>
    <p className="max-w-sm text-meta text-bone-dim">
      Nothing in the archive satisfies every active filter at once.
    </p>
    <button
      type="button"
      onClick={onClear}
      className="label border border-brass px-4 py-2 text-brass transition-colors hover:bg-brass hover:text-iron"
    >
      Clear all filters
    </button>
  </div>
);
