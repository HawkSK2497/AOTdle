import type { Character } from "../../../server/types/character";
import { cardAffiliation } from "../lib/format";
import { Portrait } from "./Portrait";
import { StatusRule } from "./StatusRule";
import { StatusTag } from "./StatusTag";

interface AnswerRevealProps {
  answer: Character;
  won: boolean;
  guesses: number;
  onNewGame: () => void;
}

/**
 * The end of a drill. Inline rather than modal — the board stays readable
 * beside it, which is the part worth looking at afterwards.
 */
export const AnswerReveal = ({
  answer,
  won,
  guesses,
  onNewGame,
}: AnswerRevealProps) => {
  const posting = cardAffiliation(answer);

  return (
    <section
      role="status"
      className={`border bg-slate p-4 sm:p-5 ${won ? "border-verdigris-fill" : "border-oxblood-fill"}`}
    >
      <p className={`label ${won ? "text-verdigris-ink" : "text-oxblood-ink"}`}>
        {won
          ? `Identified in ${guesses} ${guesses === 1 ? "guess" : "guesses"}`
          : "Not identified"}
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        <div className="w-24 shrink-0 sm:w-28">
          <Portrait
            name={answer.name}
            src={answer.imageUrl}
            width={112}
            muted={answer.status === "Deceased"}
            compact
            className="aspect-3/4 w-full"
          />
          <StatusRule status={answer.status} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="font-cond text-record text-bone">{answer.name}</h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusTag status={answer.status} />
            {answer.isTitanShifter && (
              <span className="label text-verdigris-ink">Titan shifter</span>
            )}
            {answer.heightCm !== null && (
              <span className="datum text-meta text-bone-dim">
                {answer.heightCm}
                <span className="text-bone-dim/60">cm</span>
              </span>
            )}
          </div>

          {posting && (
            <p className="label">
              {posting.former && <span className="text-bone-dim/60">Fmr. </span>}
              {posting.name}
            </p>
          )}

          <button
            type="button"
            onClick={onNewGame}
            className="label mt-2 self-start border border-brass px-4 py-2 text-brass transition-colors hover:bg-brass hover:text-iron"
          >
            New drill
          </button>
        </div>
      </div>
    </section>
  );
};
