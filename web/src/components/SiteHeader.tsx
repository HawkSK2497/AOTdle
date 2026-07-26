import { NavLink } from "react-router-dom";

/**
 * The one strip both routes share. NavLink sets aria-current on the active
 * entry, so the marked tab is not left to colour alone.
 */
const entry = ({ isActive }: { isActive: boolean }): string =>
  `label border px-3 py-2 transition-colors ${
    isActive
      ? "border-brass text-brass"
      : "border-hairline text-bone-dim hover:border-brass hover:text-brass"
  }`;

export const SiteHeader = () => (
  <div className="border-b border-hairline px-4 sm:px-6">
    <nav
      aria-label="Sections"
      className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 py-3"
    >
      <p className="label mr-auto">Records division</p>
      <NavLink to="/" end className={entry}>
        Archive
      </NavLink>
      <NavLink to="/play" className={entry}>
        Identification drill
      </NavLink>
    </nav>
  </div>
);
