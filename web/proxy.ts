import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime behavior).
// The matcher must cover /api/** — both the web app (cookie session) and
// the native iOS app (Authorization: Bearer <token>) hit routes under
// /api/**, and `auth()` inside those route handlers throws if the request
// didn't pass through this proxy first.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
