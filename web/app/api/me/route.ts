import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ id: user.clerkUserId, email: user.email, role: user.role });
  } catch (err) {
    return handleApiError(err);
  }
}
