import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession, persistSession, serializeSessionDetail } from "@/lib/sessions";
import { answerPendingQuestions, stepSession } from "@/lib/agent/run";

const Body = z.object({
  answers: z.array(z.object({ toolCallId: z.string().min(1), answer: z.string().min(1) })).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    if (session.status !== "awaiting_input") {
      return Response.json(
        { error: `Session is not awaiting input (status: ${session.status})` },
        { status: 409 },
      );
    }

    const { answers } = Body.parse(await request.json());
    answerPendingQuestions(session, answers);
    await stepSession(session);
    await persistSession(session);

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}
