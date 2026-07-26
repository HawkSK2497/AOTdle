import type { Character } from "../../../server/types/character";
import { CharacterCard } from "./CharacterCard";

interface CharacterGridProps {
  characters: Character[];
  compareIds: number[];
  compareFull: boolean;
  onOpen: (id: number) => void;
  onToggleCompare: (id: number) => void;
}

/**
 * Cards sit on a hairline lattice rather than floating apart — a records
 * table, not a gallery.
 */
export const CharacterGrid = ({
  characters,
  compareIds,
  compareFull,
  onOpen,
  onToggleCompare,
}: CharacterGridProps) => (
  <ul className="grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {characters.map((character) => (
      <li key={character.id} className="contents">
        <CharacterCard
          character={character}
          selected={compareIds.includes(character.id)}
          compareFull={compareFull}
          onOpen={() => onOpen(character.id)}
          onToggleCompare={() => onToggleCompare(character.id)}
        />
      </li>
    ))}
  </ul>
);
