import { useEffect, useState } from "react";
import type { CharacterDetail } from "../../../server/types/character";
import { ApiError, fetchCharacter } from "./client";

interface DetailState {
  detail: CharacterDetail | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Full record for the open character. Pass null when nothing is open.
 *
 * The list response already carries enough for the panel's header, so the
 * panel stays useful while this is in flight.
 */
export const useCharacterDetail = (id: number | null): DetailState => {
  const [detail, setDetail] = useState<CharacterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (id === null) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setDetail(null);
    setError(null);
    setLoading(true);

    fetchCharacter(id, controller.signal)
      .then((row) => {
        setDetail(row);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError("Could not load this record.", 0, false),
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  return { detail, loading, error };
};
