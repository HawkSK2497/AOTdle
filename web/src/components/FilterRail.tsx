import { useMemo } from "react";
import type {
  Character,
  CharacterStatus,
} from "../../../server/types/character";
import type { Filters } from "../lib/filters";
import {
  activeFilterCount,
  countShifters,
  deriveAffiliations,
  deriveStatuses,
  toggle,
} from "../lib/filters";
import { FilterGroup } from "./FilterGroup";

interface FilterRailProps {
  /** The full roster — facet counts describe the archive, not the current view. */
  characters: Character[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

const STATUS_TONE: Record<CharacterStatus, string> = {
  Alive: "text-bone",
  Deceased: "text-oxblood-ink",
  Unknown: "text-bone-dim",
};

const SHIFTER_OPTION = "Titan shifter";

export const FilterRail = ({
  characters,
  filters,
  onChange,
  onClear,
}: FilterRailProps) => {
  const statuses = useMemo(() => deriveStatuses(characters), [characters]);
  const affiliations = useMemo(
    () => deriveAffiliations(characters),
    [characters],
  );
  const shifters = useMemo(() => countShifters(characters), [characters]);

  return (
    <div className="flex flex-col gap-5">
      <FilterGroup
        title="Status"
        options={statuses.map((facet) => ({
          value: facet.value,
          count: facet.count,
          tone: STATUS_TONE[facet.value],
        }))}
        selected={filters.statuses}
        onToggle={(value) =>
          onChange({
            ...filters,
            statuses: toggle(filters.statuses, value as CharacterStatus),
          })
        }
      />

      <FilterGroup
        title="Titan power"
        options={
          shifters > 0
            ? [
                {
                  value: SHIFTER_OPTION,
                  count: shifters,
                  tone: "text-verdigris-ink",
                },
              ]
            : []
        }
        selected={filters.shifterOnly ? [SHIFTER_OPTION] : []}
        onToggle={() =>
          onChange({ ...filters, shifterOnly: !filters.shifterOnly })
        }
      />

      <FilterGroup
        title="Affiliation — current or former"
        options={affiliations}
        selected={filters.affiliations}
        onToggle={(value) =>
          onChange({
            ...filters,
            affiliations: toggle(filters.affiliations, value),
          })
        }
        scroll
      />

      {activeFilterCount(filters) > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="label self-start border border-hairline px-3 py-2 text-bone-dim transition-colors hover:border-brass hover:text-brass"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
};
