import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * New locale-aware navigation primitives. Existing callers continue using
 * localizePath until their Turkish/English pathname mappings are migrated.
 */
export const { Link, getPathname, redirect, permanentRedirect, usePathname, useRouter } = createNavigation(routing);
