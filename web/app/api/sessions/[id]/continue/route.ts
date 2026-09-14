import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession, persistSession, serializeSessionDetail } from "@/lib/sessions";
import { stepSession } from "@/lib/agent/run";

/**
 * Advances a "running" session by exactly one agent step and returns the
 * new state — a no-op if the session isn't running. Clients drive the
 * whole multi-stage generation by polling this on a timer instead of a
 * background worker: each call both progresses the work and reports it,
 * so the UI can show real per-step status (currentStage) rather than one
 * opaque spinner for the entire generation.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    await stepSession(session);
    await persistSession(session);

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}
