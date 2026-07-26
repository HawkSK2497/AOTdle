/** Placeholder plates at the real card proportions, so nothing shifts on load. */
export const GridSkeleton = () => (
  <div
    role="status"
    aria-label="Loading the archive"
    className="grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
  >
    {Array.from({ length: 12 }, (_, index) => (
      <div key={index} className="bg-slate">
        <div className="aspect-3/4 w-full animate-pulse bg-bone/5 motion-reduce:animate-none" />
        <div className="h-0.5 w-full bg-bone/10" />
        <div className="flex flex-col gap-2 p-3">
          <div className="h-4 w-3/4 bg-bone/10" />
          <div className="h-2.5 w-1/3 bg-bone/5" />
        </div>
      </div>
    ))}
  </div>
);
