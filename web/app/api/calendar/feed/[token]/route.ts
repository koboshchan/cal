import { generateFeedIcsForToken } from "@/lib/calendar-feed";

// Deliberately not behind requireUser(): calendar apps subscribing to a
// webcal:// URL can't attach our Clerk bearer token. The random token in
// the path is the credential instead.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ics = await generateFeedIcsForToken(token);
  if (ics === null) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
