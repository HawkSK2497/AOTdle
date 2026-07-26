import type { CharacterStatus } from "../../../server/types/character";

interface StatusRuleProps {
  status: CharacterStatus | null;
}

/**
 * The 2px rule under a portrait. Unknown is drawn as a broken line — the
 * uncertainty is in the record, so it belongs in the mark.
 */
export const StatusRule = ({ status }: StatusRuleProps) => {
  if (status === "Deceased") {
    return <div aria-hidden="true" className="h-0.5 w-full bg-oxblood-fill" />;
  }

  if (status === "Unknown") {
    return (
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-[repeating-linear-gradient(90deg,var(--color-bone-dim)_0_4px,transparent_4px_9px)]"
      />
    );
  }

  return <div aria-hidden="true" className="h-0.5 w-full bg-bone/25" />;
};
