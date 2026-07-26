import type { CharacterStatus } from "../../../server/types/character";

interface StatusTagProps {
  status: CharacterStatus | null;
}

/**
 * Deceased is the marked state — 117 of 189 records. Alive is left unmarked
 * rather than given a colour of its own, so oxblood keeps its meaning.
 */
const TONE: Record<CharacterStatus, string> = {
  Alive: "text-bone",
  Deceased: "text-oxblood-ink",
  Unknown: "text-bone-dim",
};

export const StatusTag = ({ status }: StatusTagProps) => {
  if (!status) return null;
  return <span className={`label ${TONE[status]}`}>{status}</span>;
};
