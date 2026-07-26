import type { GuessResult } from "../../../server/types/game";
import { guessTiles } from "../lib/game";
import { GuessTile } from "./GuessTile";
import { Portrait } from "./Portrait";

interface GuessRowProps {
  result: GuessResult;
  /** 1-based, in submission order — the board reads newest first. */
  ordinal: number;
  identified: boolean;
}

/**
 * One guess. The portrait keeps the archive's treatment — a deceased record is
 * still drawn down — but oxblood stays out of the tiles, where colour means
 * how close the guess was and nothing else.
 */
export const GuessRow = ({ result, ordinal, identified }: GuessRowProps) => (
  <li className="border border-hairline">
    <div className="flex items-center gap-3 border-b border-hairline p-3">
      <Portrait
        name={result.character.name}
        src={result.character.imageUrl}
        width={56}
        muted={result.character.status === "Deceased"}
        compact
        className="size-14 shrink-0"
      />

      <div className="min-w-0">
        <h3 className="truncate font-cond text-name text-bone">
          {result.character.name}
        </h3>
        <p className="label mt-1">Guess {ordinal}</p>
      </div>

      {identified && (
        <p className="label ml-auto shrink-0 border border-verdigris-fill px-2 py-1 text-verdigris-ink">
          Identified
        </p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-5">
      {guessTiles(result).map((tile) => (
        <GuessTile key={tile.key} tile={tile} />
      ))}
    </div>
  </li>
);
