import { useMemo, useState } from "react";
import { useCharacters } from "../api/useCharacters";
import type { Filters, SortKey } from "../lib/filters";
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  sortCharacters,
} from "../lib/filters";
import { ApiErrorPanel } from "./ApiErrorPanel";
import { ArchiveHeader } from "./ArchiveHeader";
import { CharacterGrid } from "./CharacterGrid";
import { CompareTray } from "./CompareTray";
import { DetailPanel } from "./DetailPanel";
import { FilterRail } from "./FilterRail";
import { GridEmpty } from "./GridEmpty";
import { GridSkeleton } from "./GridSkeleton";
import { SearchField } from "./SearchField";
import { SortToggle } from "./SortToggle";

/** Six columns is as many as the ruler can hold and stay legible. */
const COMPARE_LIMIT = 6;

export const App = () => {
  const { characters, loading, error, retry } = useCharacters();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("depth");
  const [openId, setOpenId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [railOpen, setRailOpen] = useState(false);

  const visible = useMemo(
    () => sortCharacters(applyFilters(characters, filters), sort),
    [characters, filters, sort],
  );

  // Selection order, not roster order — the ruler should reflect what you did.
  const compared = useMemo(
    () => compareIds.flatMap((id) => characters.filter((c) => c.id === id)),
    [compareIds, characters],
  );

  const summary = characters.find((c) => c.id === openId) ?? null;
  const deceased = characters.filter((c) => c.status === "Deceased").length;
  const withHeight = characters.filter((c) => c.heightCm !== null).length;
  const activeCount = activeFilterCount(filters);

  const toggleCompare = (id: number) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= COMPARE_LIMIT) return current;

      const character = characters.find((c) => c.id === id);
      return character && character.heightCm !== null
        ? [...current, id]
        : current;
    });
  };

  const rail = (
    <FilterRail
      characters={characters}
      filters={filters}
      onChange={setFilters}
      onClear={() => setFilters(EMPTY_FILTERS)}
    />
  );

  return (
    <div className="min-h-dvh bg-iron">
      <ArchiveHeader
        total={characters.length}
        deceased={deceased}
        withHeight={withHeight}
      />

      <div className="mx-auto flex max-w-[1600px] gap-8 px-4 pb-32 sm:px-6">
        <aside className="sticky top-0 hidden max-h-dvh w-56 shrink-0 self-start overflow-y-auto py-6 lg:block">
          {rail}
        </aside>

        <main className="min-w-0 flex-1 py-6">
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-iron py-3">
            <SearchField
              value={filters.query}
              onChange={(query) => setFilters({ ...filters, query })}
            />
            <SortToggle value={sort} onChange={setSort} />
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              aria-expanded={railOpen}
              aria-controls="filter-rail"
              className="label border border-hairline px-3 py-2.5 text-bone-dim transition-colors hover:border-brass hover:text-brass lg:hidden"
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </div>

          <div
            id="filter-rail"
            hidden={!railOpen}
            className="mb-4 border border-hairline p-4 lg:hidden"
          >
            {rail}
          </div>

          <p aria-live="polite" className="label mb-4">
            {loading
              ? "Retrieving records…"
              : `Showing ${visible.length} of ${characters.length} records`}
          </p>

          {error ? (
            <ApiErrorPanel error={error} onRetry={retry} />
          ) : loading ? (
            <GridSkeleton />
          ) : visible.length === 0 ? (
            <GridEmpty onClear={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <CharacterGrid
              characters={visible}
              compareIds={compareIds}
              compareFull={compareIds.length >= COMPARE_LIMIT}
              onOpen={setOpenId}
              onToggleCompare={toggleCompare}
            />
          )}
        </main>
      </div>

      <CompareTray
        characters={compared}
        limit={COMPARE_LIMIT}
        onRemove={(id) =>
          setCompareIds((current) => current.filter((item) => item !== id))
        }
        onClear={() => setCompareIds([])}
      />

      <DetailPanel
        summary={summary}
        onClose={() => setOpenId(null)}
        compareSelected={summary ? compareIds.includes(summary.id) : false}
        compareFull={compareIds.length >= COMPARE_LIMIT}
        onToggleCompare={() => summary && toggleCompare(summary.id)}
      />
    </div>
  );
};
