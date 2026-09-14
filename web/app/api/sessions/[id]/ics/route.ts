import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOwnedSession } from "@/lib/sessions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const session = await getOwnedSession(id, user.clerkUserId);

    if (!session.resultIcs) {
      return Response.json({ error: "This session has no finished result yet" }, { status: 409 });
    }

    return new Response(session.resultIcs, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${session.title.replace(/[^\w.-]+/g, "_") || "calendar"}.ics"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
