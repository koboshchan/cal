import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession, persistSession, serializeSessionDetail } from "@/lib/sessions";
import { refineSession } from "@/lib/agent/run";

const Body = z.object({ prompt: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    if (session.status !== "done" && session.status !== "error") {
      return Response.json(
        { error: `Session can't be refined right now (status: ${session.status})` },
        { status: 409 },
      );
    }

    const { prompt } = Body.parse(await request.json());
    await refineSession(session, prompt);
    await persistSession(session);

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}
