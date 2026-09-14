import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession, removeResultEvent, updateResultEvent, serializeSessionDetail } from "@/lib/sessions";
import { NormalizedEventSchema } from "@/lib/types";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  try {
    const user = await requireUser();
    const { id, index } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    const event = NormalizedEventSchema.parse(await request.json());
    await updateResultEvent(session, Number(index), event);

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}
