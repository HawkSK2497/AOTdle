import { useEffect, useRef } from "react";
import type { Character } from "../../../server/types/character";
import { useCharacterDetail } from "../api/useCharacterDetail";
import { splitCredits } from "../lib/format";
import { CompareToggle } from "./CompareToggle";
import { Portrait } from "./Portrait";
import { RecordField } from "./RecordField";
import { RecordStat } from "./RecordStat";
import { StatusRule } from "./StatusRule";
import { StatusTag } from "./StatusTag";

interface DetailPanelProps {
  /** The list record for the open character, or null when nothing is open. */
  summary: Character | null;
  onClose: () => void;
  compareSelected: boolean;
  compareFull: boolean;
  onToggleCompare: () => void;
}

interface Field {
  label: string;
  value: string | number | string[] | null;
}

const filled = (field: Field): boolean => {
  const { value } = field;
  if (value === null || value === undefined || value === "") return false;
  return Array.isArray(value) ? value.filter(Boolean).length > 0 : true;
};

/**
 * The full service record.
 *
 * A native <dialog> carries the modal behaviour — focus trap, Escape, inert
 * background — instead of a hand-rolled equivalent.
 */
export const DetailPanel = ({
  summary,
  onClose,
  compareSelected,
  compareFull,
  onToggleCompare,
}: DetailPanelProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { detail, loading, error } = useCharacterDetail(summary?.id ?? null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (summary && !node.open) node.showModal();
    if (!summary && node.open) node.close();
  }, [summary]);

  const credits = [
    ...splitCredits(detail?.voiceActorJp ?? null),
    ...splitCredits(detail?.voiceActorEn ?? null),
  ]
    .filter(
      (credit, index, all) =>
        all.findIndex((other) => other.actor === credit.actor) === index,
    )
    .map((credit) =>
      credit.language ? `${credit.actor} — ${credit.language}` : credit.actor,
    );

  const groups: { title: string; fields: Field[] }[] = [
    {
      title: "Identification",
      fields: [
        { label: "Kanji", value: detail?.kanji ?? null },
        { label: "Romaji", value: detail?.romaji ?? null },
        { label: "Also known as", value: detail?.aliases ?? null },
        { label: "Species", value: summary?.species ?? null },
        { label: "Gender", value: summary?.gender ?? null },
        { label: "Birthday", value: detail?.birthday ?? null },
        { label: "Birthplace", value: detail?.birthplace ?? null },
        { label: "Residence", value: detail?.residence ?? null },
      ],
    },
    {
      title: "Service",
      fields: [
        { label: "Rank", value: detail?.rank ?? null },
        { label: "Former rank", value: detail?.formerRank ?? null },
        { label: "Occupation", value: summary?.occupation ?? null },
        { label: "Former occupation", value: detail?.formerOccupation ?? null },
        { label: "Affiliations", value: summary?.affiliations ?? null },
        {
          label: "Former affiliations",
          value: summary?.formerAffiliations ?? null,
        },
      ],
    },
    {
      title: "Titan",
      fields: [
        {
          label: "Shifter",
          value: summary?.isTitanShifter ? "Confirmed" : null,
        },
        { label: "Forms", value: summary?.titanForms ?? null },
      ],
    },
    {
      title: "Media",
      fields: [
        { label: "Debut chapter", value: detail?.debutChapter ?? null },
        { label: "Debut episode", value: summary?.debutEpisode ?? null },
        { label: "Voice cast", value: credits },
        {
          label: "Adaptation",
          value: detail ? (detail.isInAnime ? "Anime" : "Manga only") : null,
        },
      ],
    },
  ];

  const hasStats =
    summary !== null &&
    (summary.heightCm !== null ||
      detail?.weightKg !== null ||
      detail?.titanKillsTotal !== null ||
      detail?.gradRank !== null);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="detail-name"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[440px] border-l border-hairline bg-slate p-0 text-bone backdrop:bg-scrim"
    >
      {summary && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-hairline p-4 sm:p-5">
            <div className="min-w-0">
              <p className="label text-brass">Record {summary.id}</p>
              <h2
                id="detail-name"
                className="mt-1 font-cond text-record text-bone"
              >
                {summary.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="label shrink-0 border border-hairline px-3 py-2 text-bone-dim transition-colors hover:border-brass hover:text-brass"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="flex gap-4">
              <div className="w-28 shrink-0 sm:w-32">
                <Portrait
                  name={summary.name}
                  src={summary.imageUrl}
                  muted={summary.status === "Deceased"}
                  className="aspect-3/4 w-full"
                />
                <StatusRule status={summary.status} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusTag status={summary.status} />
                  {summary.isTitanShifter && (
                    <span className="label text-verdigris-ink">
                      Titan shifter
                    </span>
                  )}
                </div>

                {(detail?.romaji ?? detail?.kanji) && (
                  <p className="text-meta text-bone-dim">
                    {detail?.kanji} {detail?.romaji}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-2">
                  <CompareToggle
                    name={summary.name}
                    heightCm={summary.heightCm}
                    selected={compareSelected}
                    full={compareFull}
                    onToggle={onToggleCompare}
                  />
                  <span className="label">
                    {summary.heightCm === null
                      ? "No recorded height"
                      : compareSelected
                        ? "On the ruler"
                        : "Add to ruler"}
                  </span>
                </div>
              </div>
            </div>

            {hasStats && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <RecordStat
                  label="Height"
                  value={summary.heightCm}
                  unit="cm"
                />
                <RecordStat
                  label="Weight"
                  value={detail?.weightKg ?? null}
                  unit="kg"
                />
                <RecordStat
                  label="Titan kills"
                  value={detail?.titanKillsTotal ?? null}
                />
                <RecordStat
                  label="Graduation rank"
                  value={detail?.gradRank ?? null}
                />
              </div>
            )}

            {loading && (
              <p className="label mt-6" role="status">
                Retrieving full record…
              </p>
            )}

            {error && (
              <p className="mt-6 border border-oxblood-fill p-3 text-meta text-oxblood-ink" role="alert">
                {error.message} The summary above is from the roster already
                loaded.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-6">
              {groups
                .filter((group) => group.fields.some(filled))
                .map((group) => (
                  <section key={group.title}>
                    <h3 className="label text-brass">{group.title}</h3>
                    <dl className="mt-2">
                      {group.fields.map((field) => (
                        <RecordField
                          key={field.label}
                          label={field.label}
                          value={field.value}
                        />
                      ))}
                    </dl>
                  </section>
                ))}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
};
