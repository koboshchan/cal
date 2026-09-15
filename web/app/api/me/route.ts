import { requireUser, isAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export async function GET() {
  try {
    const user = await requireUser();
    const role = (await isAdmin(user)) ? "admin" : "user";
    return Response.json({ id: user.clerkUserId, email: user.email, role });
  } catch (err) {
    return handleApiError(err);
  }
}
