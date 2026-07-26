import type { Character } from "../../../server/types/character";
import {
  RULER_MAX_CM,
  RULER_MEDIAN_CM,
  rulerFraction,
  rulerTicks,
} from "../lib/format";
import { Portrait } from "./Portrait";
import { StatusRule } from "./StatusRule";

interface HeightRulerProps {
  /** Only records with a recorded height ever reach the ruler. */
  characters: Character[];
  onRemove: (id: number) => void;
}

/** Plot height. Shared by the axis, the gridlines and every column. */
const PLOT = "h-[180px] sm:h-[240px]";

const percent = (cm: number): string => `${rulerFraction(cm) * 100}%`;

/**
 * The archive's one composed moment: selected records standing on a shared
 * floor, drawn to scale.
 *
 * The axis starts at zero. Truncating it at 130cm would make a 20cm gap look
 * like a chasm, and the point of the comparison is the real proportion.
 * Titan forms are 4–60m and are deliberately not on this chart.
 */
export const HeightRuler = ({ characters, onRemove }: HeightRulerProps) => (
  <div className="flex gap-2 sm:gap-3">
    {/* Axis */}
    <div className={`relative w-8 shrink-0 sm:w-10 ${PLOT}`} aria-hidden="true">
      {rulerTicks().map((cm) => (
        <span
          key={cm}
          className="datum absolute right-0 translate-y-1/2 text-label text-bone-dim/70"
          style={{ bottom: percent(cm) }}
        >
          {cm}
        </span>
      ))}
    </div>

    <div className="relative min-w-0 flex-1">
      {/* Gridlines, the floor, and the median of all 112 recorded heights. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 ${PLOT}`}
      >
        {rulerTicks().map((cm) => (
          <div
            key={cm}
            className={`absolute inset-x-0 ${cm === 0 ? "h-px bg-bone/30" : "h-px bg-hairline"}`}
            style={{ bottom: percent(cm) }}
          />
        ))}
        <div
          className="absolute inset-x-0 flex items-center justify-end border-t border-dashed border-brass/50"
          style={{ bottom: percent(RULER_MEDIAN_CM) }}
        >
          <span className="label mr-2 bg-slate px-1 text-brass/80">
            Median {RULER_MEDIAN_CM}
          </span>
        </div>
      </div>

      {/* overflow-x:auto forces overflow-y to `auto` too, and the cm labels sit
          above the plates — pinning Y to hidden stops a scrollbar flickering in
          while the columns animate. The pt leaves the labels room. */}
      <ul className="relative flex gap-2 overflow-x-auto overflow-y-hidden pt-5 sm:gap-4">
        {characters.map((character, index) => (
          <li
            key={character.id}
            className="flex w-16 shrink-0 flex-col sm:w-20"
          >
            <div className={`relative ${PLOT}`}>
              <span
                className="datum absolute inset-x-0 text-center text-label text-bone"
                style={{
                  bottom: `calc(${percent(character.heightCm ?? 0)} + 6px)`,
                }}
              >
                {character.heightCm}
                <span className="text-bone-dim/60">cm</span>
              </span>

              <div
                className="rise absolute inset-x-0 bottom-0 overflow-hidden"
                style={{
                  height: percent(character.heightCm ?? 0),
                  animationDelay: `${index * 40}ms`,
                }}
              >
                <Portrait
                  name={character.name}
                  src={character.imageUrl}
                  width={96}
                  muted={character.status === "Deceased"}
                  compact
                  className={`h-full w-full ${
                    character.isTitanShifter
                      ? "border border-b-0 border-verdigris-fill"
                      : ""
                  }`}
                />
                <div className="absolute inset-x-0 bottom-0">
                  <StatusRule status={character.status} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-1 pt-2">
              <p className="label flex-1 leading-tight text-bone">
                {character.name}
              </p>
              <button
                type="button"
                onClick={() => onRemove(character.id)}
                aria-label={`Remove ${character.name} from the height comparison`}
                className="shrink-0 font-mono text-label text-bone-dim transition-colors hover:text-oxblood-ink"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <p className="sr-only" aria-live="polite">
      {characters
        .map((character) => `${character.name}, ${character.heightCm} cm`)
        .join(". ")}
    </p>
    <span className="sr-only">Ruler runs from 0 to {RULER_MAX_CM} cm.</span>
  </div>
);
