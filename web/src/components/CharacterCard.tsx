import type { Character } from "../../../server/types/character";
import { cardAffiliation } from "../lib/format";
import { CompareToggle } from "./CompareToggle";
import { Portrait } from "./Portrait";
import { StatusRule } from "./StatusRule";
import { StatusTag } from "./StatusTag";

interface CharacterCardProps {
  character: Character;
  selected: boolean;
  compareFull: boolean;
  onOpen: () => void;
  onToggleCompare: () => void;
}

/**
 * One record in the grid. Most of these characters have a name, a status and
 * very little else, so every row below the portrait is conditional — a sparse
 * record ends early instead of filling with dashes.
 */
export const CharacterCard = ({
  character,
  selected,
  compareFull,
  onOpen,
  onToggleCompare,
}: CharacterCardProps) => {
  const posting = cardAffiliation(character);

  return (
    <article className="relative bg-slate">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open the record for ${character.name}`}
        className="flex h-full w-full flex-col text-left"
      >
        <Portrait
          name={character.name}
          src={character.imageUrl}
          muted={character.status === "Deceased"}
          compact
          className="aspect-3/4 w-full"
        />
        <StatusRule status={character.status} />

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="font-cond text-name text-bone">{character.name}</h3>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusTag status={character.status} />
            {character.isTitanShifter && (
              <span className="label text-verdigris-ink">Shifter</span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            {posting ? (
              <p className="label truncate" title={posting.name}>
                {posting.former && (
                  <span className="text-bone-dim/60">Fmr. </span>
                )}
                {posting.name}
              </p>
            ) : (
              <span />
            )}

            {character.heightCm !== null && (
              <p className="datum shrink-0 text-meta text-bone-dim">
                {character.heightCm}
                <span className="text-bone-dim/60">cm</span>
              </p>
            )}
          </div>
        </div>
      </button>

      <CompareToggle
        name={character.name}
        heightCm={character.heightCm}
        selected={selected}
        full={compareFull}
        onToggle={onToggleCompare}
        className="absolute top-2 right-2"
      />
    </article>
  );
};
