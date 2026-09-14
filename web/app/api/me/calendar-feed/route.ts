import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getOrCreateFeedToken } from "@/lib/calendar-feed";

export async function GET() {
  try {
    const user = await requireUser();
    const token = await getOrCreateFeedToken(user.clerkUserId);
    return Response.json({ path: `/api/calendar/feed/${token}` });
  } catch (err) {
    return handleApiError(err);
  }
}
