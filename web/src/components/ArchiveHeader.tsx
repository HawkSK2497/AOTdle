interface ArchiveHeaderProps {
  total: number;
  deceased: number;
  withHeight: number;
}

/**
 * The counts are the masthead. 117 of 189 records are casualties — stating it
 * plainly is truer to the material than any styling could be.
 */
export const ArchiveHeader = ({
  total,
  deceased,
  withHeight,
}: ArchiveHeaderProps) => (
  <header className="border-b border-hairline px-4 py-6 sm:px-6">
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <p className="label text-brass">Personnel records</p>
        <h1 className="mt-1.5 font-cond text-display tracking-tight text-bone">
          Survey Corps Archive
        </h1>
      </div>

      <dl className="flex gap-6 sm:gap-8">
        <div>
          <dt className="label">Records</dt>
          <dd className="datum mt-1 text-record text-bone">{total}</dd>
        </div>
        <div>
          <dt className="label">Deceased</dt>
          <dd className="datum mt-1 text-record text-oxblood-ink">
            {deceased}
          </dd>
        </div>
        <div>
          <dt className="label">Height on file</dt>
          <dd className="datum mt-1 text-record text-bone-dim">{withHeight}</dd>
        </div>
      </dl>
    </div>
  </header>
);
