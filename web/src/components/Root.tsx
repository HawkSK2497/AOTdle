import { Outlet } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";

/** Shared chrome. Everything else belongs to whichever route is showing. */
export const Root = () => (
  <div className="min-h-dvh bg-iron">
    <SiteHeader />
    <Outlet />
  </div>
);
