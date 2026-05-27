import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// StackBlitz WebContainers depend on SharedArrayBuffer, which the
// browser only exposes under cross-origin isolation. Apply the
// COOP/COEP pair to the /terminal route prefix only — slapping it on
// every route would break cross-origin <img>/<iframe>/RPC traffic for
// unrelated pages.
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
    // next-intl serves /terminal under each locale prefix
    // (`/en/terminal`, `/es/terminal`, …). Constrain to the configured
    // locale set so we don't accidentally widen the isolation blast
    // radius to unrelated routes.
    return [
      {
        source: "/:locale(en|es)/terminal/:path*",
        headers: isolation,
      },
      {
        source: "/:locale(en|es)/terminal",
        headers: isolation,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
