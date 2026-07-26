import type { Tile, TileState } from "../lib/game";

interface GuessTileProps {
  tile: Tile;
}

/**
 * Colour repeats the verdict, it never carries it. Every tile spells out
 * "Match", "Partial", "Miss" or "No record" in words, so the board is legible
 * with no colour vision at all.
 */
const PLATE: Record<TileState, string> = {
  exact: "border-verdigris-fill bg-verdigris-fill/20",
  partial: "border-brass bg-brass/15",
  none: "border-hairline bg-slate",
  unrecorded: "border-hairline bg-iron",
};

const NOTE_TONE: Record<TileState, string> = {
  exact: "text-verdigris-ink",
  partial: "text-brass",
  none: "text-bone-dim",
  unrecorded: "text-bone-dim/70",
};

const ARROW = { up: "▲", down: "▼" };

export const GuessTile = ({ tile }: GuessTileProps) => (
  <div
    className={`flex min-w-0 flex-col gap-1 border p-2 last:col-span-2 sm:last:col-span-1 ${PLATE[tile.state]}`}
  >
    <p className="label">{tile.label}</p>
    <p
      title={tile.value}
      className={`truncate text-meta text-bone ${tile.numeric ? "datum" : ""}`}
    >
      {tile.value}
    </p>
    <p className={`label mt-auto flex items-center gap-1 ${NOTE_TONE[tile.state]}`}>
      {tile.arrow && (
        <span aria-hidden="true" className="text-[0.9em] leading-none">
          {ARROW[tile.arrow]}
        </span>
      )}
      {tile.note}
    </p>
  </div>
);
