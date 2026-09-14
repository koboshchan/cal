import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getDb } from "@/lib/mongodb";
import { getOwnedSession, serializeSessionDetail } from "@/lib/sessions";
import type { AgentSessionDoc } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);
    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchBody = z.object({ title: z.string().min(1) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    const { title } = PatchBody.parse(await request.json());
    session.title = title;
    session.updatedAt = new Date();

    const db = await getDb();
    await db
      .collection<AgentSessionDoc>("sessions")
      .updateOne({ _id: session._id }, { $set: { title, updatedAt: session.updatedAt } });

    return Response.json(serializeSessionDetail(session));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    const db = await getDb();
    await db.collection<AgentSessionDoc>("sessions").deleteOne({ _id: session._id });

    return Response.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
