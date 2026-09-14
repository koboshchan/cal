import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession, removeResultEvent, serializeSessionDetail } from "@/lib/sessions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  try {
    const user = await requireUser();
    const { id, index } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    await removeResultEvent(session, Number(index));

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}
