import type { Metadata } from "next";

export const SITE_URL = "https://otoyali.vercel.app";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildSeoMetadata({
  title,
  description,
  path,
  noIndex = false
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: `${title} | OTOYALI`,
      description,
      url,
      siteName: "OTOYALI",
      locale: "tr_TR",
      type: "website"
    },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}
