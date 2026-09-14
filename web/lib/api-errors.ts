import { UnauthorizedError, ForbiddenError } from "./auth";
import { NotConfiguredError } from "./agent/provider";
import { NotFoundError } from "./sessions";

export function handleApiError(err: unknown): Response {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return Response.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof NotConfiguredError) {
    return Response.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof NotFoundError) {
    return Response.json({ error: err.message }, { status: 404 });
  }
  console.error(err);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
