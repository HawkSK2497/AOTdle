import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Character } from "../../../server/types/character";
import { searchRoster } from "../lib/game";

interface GuessInputProps {
  /** The roster minus everything already guessed. */
  characters: Character[];
  busy: boolean;
  onSelect: (character: Character) => void;
}

/** Enough to choose from without burying the board. */
const MAX_OPTIONS = 8;

/**
 * An ARIA 1.2 combobox: arrows move, Enter selects, Escape closes. The mouse
 * is optional throughout — the list never has to be clicked.
 */
export const GuessInput = ({ characters, busy, onSelect }: GuessInputProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(
    () => searchRoster(characters, query, MAX_OPTIONS),
    [characters, query],
  );

  // A shorter list must not leave the highlight pointing past its end.
  useEffect(() => setActive(0), [query]);

  // Keyboard travel has to move the viewport too, not just the highlight.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
  });

  const choose = (character: Character) => {
    onSelect(character);
    setQuery("");
    setActive(0);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((current) =>
        event.key === "ArrowDown"
          ? Math.min(current + 1, options.length - 1)
          : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    }
  };

  const expanded = open && options.length > 0;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="flex items-center gap-3 border border-hairline bg-slate px-3 py-2 focus-within:border-brass">
        <label htmlFor="guess-input" className="label shrink-0">
          Guess
        </label>
        <input
          id="guess-input"
          type="text"
          role="combobox"
          value={query}
          disabled={busy}
          autoComplete="off"
          placeholder="Name or alias"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? optionId(active) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-body text-bone outline-none placeholder:text-bone-dim/50 disabled:text-bone-dim"
        />
        <span className="label shrink-0">
          {busy ? "Sending…" : `${characters.length} left`}
        </span>
      </div>

      <p aria-live="polite" className="sr-only">
        {open
          ? `${options.length} of ${characters.length} records match`
          : ""}
      </p>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Matching records"
        hidden={!expanded}
        className="absolute z-30 max-h-72 w-full overflow-y-auto border border-brass bg-slate"
      >
        {options.map((character, index) => (
          <li
            key={character.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            // mousedown, not click: the input must not blur before we select.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(character);
            }}
            onMouseEnter={() => setActive(index)}
            className={`flex cursor-pointer items-baseline gap-2 px-3 py-2 ${
              index === active ? "bg-brass/20 text-brass" : "text-bone"
            }`}
          >
            <span className="truncate text-meta">{character.name}</span>
            {character.status === "Deceased" && (
              <span className="label ml-auto shrink-0 text-oxblood-ink">
                Deceased
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
