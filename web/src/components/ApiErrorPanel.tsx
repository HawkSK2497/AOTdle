import type { ApiError } from "../api/client";

interface ApiErrorPanelProps {
  error: ApiError;
  onRetry: () => void;
}

/**
 * A dead API is the most likely failure in development, so name the cause
 * instead of showing an empty grid and letting the user guess.
 */
export const ApiErrorPanel = ({ error, onRetry }: ApiErrorPanelProps) => (
  <div
    role="alert"
    className="flex flex-col items-start gap-4 border border-oxblood-fill bg-slate p-8"
  >
    <p className="label text-oxblood-ink">Archive unavailable</p>
    <p className="font-cond text-record text-bone">{error.message}</p>
    <p className="max-w-lg text-meta text-bone-dim">
      {error.offline ? (
        <>
          Nothing answered on <span className="datum">localhost:3001</span>.
          Start the API with <span className="datum">npm run api</span> and try
          again.
        </>
      ) : (
        <>
          The API is reachable but returned an error. Check its console output
          and that Postgres is running.
        </>
      )}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="label border border-brass px-4 py-2 text-brass transition-colors hover:bg-brass hover:text-iron"
    >
      Retry
    </button>
  </div>
);
