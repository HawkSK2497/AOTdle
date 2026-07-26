import { useCallback, useEffect, useState } from "react";
import type { Character } from "../../../server/types/character";
import { ApiError, fetchCharacters } from "./client";

interface CharactersState {
  characters: Character[];
  loading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * Loads the whole roster once. Small enough (189 records) that every search
 * and filter afterwards runs in memory.
 */
export const useCharacters = (): CharactersState => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchCharacters(controller.signal)
      .then((rows) => {
        setCharacters(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError("Could not load the archive.", 0, false),
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  return { characters, loading, error, retry };
};
