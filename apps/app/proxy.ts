import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // /dyspel/* is the agent-wasm backend proxy and must NOT be locale-rewritten.
  matcher: ["/((?!api|dyspel|_next|_vercel|.*\\..*).*)"],
};
