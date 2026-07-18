import type { SVGAttributes } from "react";
import { cn } from "@/lib/cn";

export type IconName =
  | "search"
  | "filter"
  | "heart"
  | "user"
  | "bell"
  | "car"
  | "truck"
  | "ship"
  | "parts"
  | "service"
  | "shield"
  | "motorcycle"
  | "machinery"
  | "mobility"
  | "video"
  | "plus"
  | "check"
  | "close"
  | "chevronRight"
  | "warning"
  | "info";

const iconPaths: Record<IconName, string[]> = {
  search: ["M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z", "M15.5 15.5 20 20"],
  filter: ["M4 6h16", "M7 12h10", "M10 18h4"],
  heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  bell: ["M18 9a6 6 0 0 0-12 0c0 7-2 7-2 8h16c0-1-2-1-2-8Z", "M10 20h4"],
  car: ["M5 13l1.6-4.2A3 3 0 0 1 9.4 7h5.2a3 3 0 0 1 2.8 1.8L19 13", "M4 13h16v5H4z", "M7 18v2", "M17 18v2"],
  truck: ["M3 7h11v10H3z", "M14 11h4l3 3v3h-7z", "M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", "M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"],
  ship: ["M4 16l2-7h12l2 7", "M3 16h18", "M6 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1", "M9 9V5h6v4"],
  parts: ["M8 4h8v5H8z", "M6 13h12v7H6z", "M10 9v4", "M14 9v4"],
  service: ["M14.5 5.5 18 2l4 4-3.5 3.5", "M15 9l-8 8-3 1 1-3 8-8", "M4 21h16"],
  shield: ["M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z", "M9 12l2 2 4-5"],
  motorcycle: ["M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M8 14h5l3-5h3", "M10 9h3", "M13 14l-3-5"],
  machinery: ["M4 17h10V9H4z", "M14 17l5-4v4h2", "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M16 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M6 9l4-5h4"],
  mobility: ["M7 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M10 14h4", "M12 8v6", "M9 8h6"],
  video: ["M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z", "M17 10l4-2v8l-4-2"],
  plus: ["M12 5v14", "M5 12h14"],
  check: ["M5 12.5l4 4L19 6.5"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  chevronRight: ["M9 5l7 7-7 7"],
  warning: ["M12 4l9 16H3L12 4Z", "M12 9v5", "M12 17h.01"],
  info: ["M12 17v-6", "M12 7h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]
};

export function Icon({
  name,
  label,
  className,
  ...props
}: SVGAttributes<SVGSVGElement> & {
  name: IconName;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("h-5 w-5 shrink-0", className)}
      {...props}
    >
      {iconPaths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
