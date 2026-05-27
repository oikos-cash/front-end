import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// StackBlitz WebContainers depend on SharedArrayBuffer, which the
// browser only exposes under cross-origin isolation. The agent shell
// now lives in a bottom drawer mounted in the locale layout, so it can
// boot on ANY route — meaning the COOP/COEP pair has to apply
// app-wide. We use `credentialless` (not `require-corp`) which is the
// looser COEP variant: cross-origin sub-resources still load as long
// as they're fetched without credentials, so token icons, RPC POSTs,
// and rainbow-kit transports keep working.
const STACKBLITZ_ENABLED =
  process.env.NEXT_PUBLIC_WEBCONTAINER_BACKEND === "stackblitz";

const nextConfig: NextConfig = {
  // The mcp/ workspace package ships TypeScript source (no build step).
  // transpilePackages tells Next/Turbopack to compile it like local code,
  // which also makes the `.js` ESM-style import specifiers in mcp/src
  // resolve to their `.ts` siblings.
  transpilePackages: ["@oikos/ui-mcp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets-cdn.trustwallet.com",
      },
    ],
  },
  async headers() {
    if (!STACKBLITZ_ENABLED) return [];
    const isolation = [
      { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      {
        source: "/:path*",
        headers: isolation,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
