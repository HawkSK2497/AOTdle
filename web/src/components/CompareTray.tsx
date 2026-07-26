import { useEffect, useRef, useState } from "react";
import type { Character } from "../../../server/types/character";
import { HeightRuler } from "./HeightRuler";

interface CompareTrayProps {
  characters: Character[];
  limit: number;
  onRemove: (id: number) => void;
  onClear: () => void;
}

/**
 * Docked at the foot of the archive. Collapsed to a single bar until there is
 * something to compare, so the grid stays the subject until you ask otherwise.
 */
export const CompareTray = ({
  characters,
  limit,
  onRemove,
  onClear,
}: CompareTrayProps) => {
  const [expanded, setExpanded] = useState(false);
  const previousCount = useRef(0);

  // Opens itself the first time a record is added, then stays under manual
  // control — nothing worse than a panel that fights the user.
  useEffect(() => {
    if (previousCount.current === 0 && characters.length > 0) {
      setExpanded(true);
    }
    previousCount.current = characters.length;
  }, [characters.length]);

  return (
    <section
      aria-label="Height comparison"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-slate"
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="compare-body"
          className="group flex flex-1 items-center gap-3 py-3 text-left"
        >
          <span
            aria-hidden="true"
            className={`font-mono text-meta text-brass transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            ▲
          </span>
          <span className="label text-bone group-hover:text-brass">
            Compare heights
          </span>
          <span className="datum text-label text-bone-dim">
            {characters.length} / {limit}
          </span>
        </button>

        {characters.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="label shrink-0 text-bone-dim transition-colors hover:text-brass"
          >
            Clear
          </button>
        )}
      </div>

      <div
        id="compare-body"
        hidden={!expanded}
        className="mx-auto max-w-[1600px] px-4 pb-5 sm:px-6"
      >
        {characters.length === 0 ? (
          <div className="border-t border-hairline pt-5 pb-2">
            <p className="font-cond text-name text-bone">
              Select up to {limit} records to see them on a shared ruler.
            </p>
            <p className="mt-1.5 max-w-lg text-meta text-bone-dim">
              Use the <span className="datum text-brass">+</span> on any card.
              112 of the 189 records carry a height; the rest cannot be
              measured. Human height only — titan forms are not on this scale.
            </p>
          </div>
        ) : (
          <div className="border-t border-hairline pt-4">
            <HeightRuler characters={characters} onRemove={onRemove} />
          </div>
        )}
      </div>
    </section>
  );
};
