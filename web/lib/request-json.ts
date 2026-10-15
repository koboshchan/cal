import { InvalidRequestError } from "./sessions";

/** Distinguish malformed client JSON from unexpected runtime failures. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new InvalidRequestError("Request body must be valid JSON");
    throw error;
  }
}
