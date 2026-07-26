import { useState } from "react";
import { initials, isNotFoundGraphic, portraitSrc } from "../lib/format";

interface PortraitProps {
  name: string;
  src: string | null;
  /** Deceased portraits are drawn down. The grid is mostly grey; so is the record. */
  muted?: boolean;
  /** Drop the fallback caption where there is no room for it. */
  compact?: boolean;
  className?: string;
}

/**
 * Images are hotlinked from Fandom and some of them 404. A missing URL and a
 * dead one land in the same place: a plate, never a broken-image icon.
 */
export const Portrait = ({
  name,
  src,
  muted = false,
  compact = false,
  className = "",
}: PortraitProps) => {
  const [failed, setFailed] = useState(false);
  const href = portraitSrc(src);

  if (!href || failed) {
    return (
      <div
        className={`hatch flex flex-col items-center justify-center gap-2 bg-slate ${className}`}
        role="img"
        aria-label={`No portrait on record for ${name}`}
      >
        <span
          aria-hidden="true"
          className="font-cond text-record text-bone-dim/70"
        >
          {initials(name)}
        </span>
        {!compact && (
          <span className="label text-bone-dim/70">No image on record</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={href}
      alt={`Portrait of ${name}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        if (isNotFoundGraphic(event.currentTarget)) setFailed(true);
      }}
      className={`bg-slate object-cover object-top ${muted ? "grayscale-[0.2]" : ""} ${className}`}
    />
  );
};
