import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession } from "@/lib/sessions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);
    return Response.json({
      id: session._id.toString(),
      status: session.status,
      title: session.title,
      userPrompt: session.userPrompt,
      pendingQuestion: session.pendingQuestion,
      resultEvents: session.resultEvents,
      error: session.error,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
