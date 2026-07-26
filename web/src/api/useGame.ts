import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "../../../server/types/game";
import { ApiError, fetchGame, sendGuess, startGame } from "./client";

const STORAGE_KEY = "aotdle.gameId";

interface GameSession {
  state: GameState | null;
  /** Size of the answer pool, as the server reports it. */
  totalCharacters: number | null;
  loading: boolean;
  /** Fatal: there is no game to play. */
  error: ApiError | null;
  /** One guess failed. The board is still good. */
  guessError: string | null;
  submitting: boolean;
  guess: (characterId: number) => void;
  newGame: () => void;
  retry: () => void;
}

const asApiError = (err: unknown): ApiError =>
  err instanceof ApiError ? err : new ApiError("The drill failed.", 0, false);

/**
 * One drill per browser tab.
 *
 * The id is kept in sessionStorage so a refresh resumes the same board — the
 * server holds every guess already. Games live in the API's memory, so after a
 * restart the id 404s and a fresh game is opened in its place.
 */
export const useGame = (): GameSession => {
  const [state, setState] = useState<GameState | null>(null);
  const [totalCharacters, setTotalCharacters] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [request, setRequest] = useState(() => ({
    n: 0,
    resume: sessionStorage.getItem(STORAGE_KEY),
  }));

  // StrictMode runs effects twice on mount. Opening two games would leave an
  // orphan in the server's Map, so each request is honoured exactly once.
  const handled = useRef(-1);

  useEffect(() => {
    if (handled.current === request.n) return;
    handled.current = request.n;

    const open = async () => {
      setLoading(true);
      setError(null);
      setGuessError(null);

      try {
        if (request.resume) {
          try {
            setState(await fetchGame(request.resume));
            setLoading(false);
            return;
          } catch (err) {
            // A game the server has forgotten is not a failure worth showing.
            if (!(err instanceof ApiError) || err.status !== 404) throw err;
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }

        const opened = await startGame();
        sessionStorage.setItem(STORAGE_KEY, opened.gameId);
        setTotalCharacters(opened.totalCharacters);
        setState({
          gameId: opened.gameId,
          guesses: [],
          maxGuesses: opened.maxGuesses,
          status: "playing",
          answer: null,
        });
      } catch (err) {
        setError(asApiError(err));
      } finally {
        setLoading(false);
      }
    };

    void open();
  }, [request]);

  const guess = useCallback(
    (characterId: number) => {
      if (!state || state.status !== "playing" || submitting) return;

      setSubmitting(true);
      setGuessError(null);

      sendGuess(state.gameId, characterId)
        .then(setState)
        .catch((err: unknown) => {
          const failure = asApiError(err);
          setGuessError(failure.detail ?? failure.message);
        })
        .finally(() => setSubmitting(false));
    },
    [state, submitting],
  );

  const newGame = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState(null);
    setRequest((current) => ({ n: current.n + 1, resume: null }));
  }, []);

  const retry = useCallback(
    () =>
      setRequest((current) => ({
        n: current.n + 1,
        resume: sessionStorage.getItem(STORAGE_KEY),
      })),
    [],
  );

  return {
    state,
    totalCharacters,
    loading,
    error,
    guessError,
    submitting,
    guess,
    newGame,
    retry,
  };
};
