import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// /admin and /<locale>/admin (plus subpaths) sit behind HTTP Basic Auth.
const ADMIN_PATH = new RegExp(
  `^/(?:(?:${routing.locales.join("|")})/)?admin(?:/|$)`,
);

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAdminAuthorized(request: NextRequest): boolean {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  // Fail closed: no configured credentials means nobody gets in.
  if (!user || !password) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  return safeEqual(decoded, `${user}:${password}`);
}

export default function proxy(request: NextRequest) {
  if (ADMIN_PATH.test(request.nextUrl.pathname) && !isAdminAuthorized(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Oikos Admin", charset="UTF-8"' },
    });
  }
  return intlMiddleware(request);
}

export const config = {
  // /dyspel/* is the agent-wasm backend proxy and must NOT be locale-rewritten.
  matcher: ["/((?!api|dyspel|_next|_vercel|.*\\..*).*)"],
};
