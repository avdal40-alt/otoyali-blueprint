/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Runtime routing tests opt into an isolated artifact. Normal builds and
  // starts deliberately retain Next.js's default `.next` directory.
  distDir: process.env.YOLMOD_I18N_TEST_DIST_DIR || ".next"
};

export default withNextIntl(nextConfig);
