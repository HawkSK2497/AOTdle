import { useMemo } from "react";
import { useCharacters } from "../api/useCharacters";
import { useGame } from "../api/useGame";
import { AnswerReveal } from "./AnswerReveal";
import { ApiErrorPanel } from "./ApiErrorPanel";
import { GuessInput } from "./GuessInput";
import { GuessRow } from "./GuessRow";

/**
 * The drill at /play.
 *
 * The roster is fetched the same way the archive fetches it — all 189 records
 * once, filtered in memory. Every verdict comes from the server; nothing here
 * knows the answer until the server sends it.
 */
export const GameScreen = () => {
  const { characters, loading: rosterLoading, error: rosterError, retry } =
    useCharacters();
  const game = useGame();

  const guessedIds = useMemo(
    () => new Set(game.state?.guesses.map((guess) => guess.character.id) ?? []),
    [game.state],
  );

  const available = useMemo(
    () => characters.filter((character) => !guessedIds.has(character.id)),
    [characters, guessedIds],
  );

  const state = game.state;
  const playing = state?.status === "playing";
  const used = state?.guesses.length ?? 0;
  const remaining = (state?.maxGuesses ?? 0) - used;

  // The server is authoritative about the pool; the roster stands in until the
  // first response lands, and a refresh resumes a game without re-reporting it.
  const pool = game.totalCharacters ?? (characters.length || null);

  // A dead API fails both requests, and only one panel is on screen. Retrying
  // just the visible one would leave the other broken behind it.
  const retryAll = () => {
    retry();
    game.retry();
  };

  return (
    <>
      <header className="border-b border-hairline px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="label text-brass">Field identification</p>
            <h1 className="mt-1.5 font-cond text-display tracking-tight text-bone">
              Identify the record
            </h1>
          </div>

          <dl className="flex gap-6 sm:gap-8">
            <div>
              <dt className="label">Guesses left</dt>
              <dd className="datum mt-1 text-record text-bone">
                {state ? remaining : "—"}
              </dd>
            </div>
            <div>
              <dt className="label">Pool</dt>
              <dd className="datum mt-1 text-record text-bone-dim">
                {pool ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-6 pb-24 sm:px-6">
        {rosterError ? (
          <ApiErrorPanel error={rosterError} onRetry={retryAll} />
        ) : game.error ? (
          <ApiErrorPanel error={game.error} onRetry={retryAll} />
        ) : (
          <>
            <p className="text-meta text-bone-dim">
              One record is drawn from the archive. Name it in{" "}
              <span className="datum">{state?.maxGuesses ?? 8}</span> guesses —
              each one is compared against the answer, attribute by attribute.
            </p>

            {playing && (
              <GuessInput
                characters={available}
                busy={game.submitting || rosterLoading}
                onSelect={(character) => game.guess(character.id)}
              />
            )}

            {game.guessError && (
              <p
                role="alert"
                className="border border-oxblood-fill p-3 text-meta text-oxblood-ink"
              >
                {game.guessError}
              </p>
            )}

            {state?.answer && (
              <AnswerReveal
                answer={state.answer}
                won={state.status === "won"}
                guesses={used}
                onNewGame={game.newGame}
              />
            )}

            <p aria-live="polite" className="label">
              {game.loading || rosterLoading
                ? "Drawing a record…"
                : used === 0
                  ? "No guesses recorded"
                  : `${used} of ${state?.maxGuesses} guesses recorded`}
            </p>

            {state && state.guesses.length > 0 && (
              <ol className="flex flex-col gap-2">
                {[...state.guesses].reverse().map((result, index) => (
                  <GuessRow
                    key={result.character.id}
                    result={result}
                    ordinal={state.guesses.length - index}
                    identified={
                      state.status === "won" &&
                      result.character.id === state.answer?.id
                    }
                  />
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </>
  );
};
