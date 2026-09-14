import { generateObject } from "ai";
import { z } from "zod";
import { getChatModel } from "./provider";

const Summary = z.object({
  title: z.string().describe("3-6 word label for a list view, no trailing punctuation, no quotes"),
  description: z
    .string()
    .describe(
      "The user's request restated as one or two clear, properly worded sentences — fix typos/grammar, but preserve every specific (days, times, dates, exceptions, counts).",
    ),
});

/**
 * Best-effort: a session should never fail to create just because this
 * cosmetic step failed, so this falls back to plain, ungenerated text.
 */
export async function summarizeRequest(opts: {
  userPrompt: string;
  imageNote?: string;
  eventCount: number;
}): Promise<{ title: string; description: string }> {
  const { userPrompt, imageNote, eventCount } = opts;

  const context: string[] = [];
  if (userPrompt) context.push(`Request: ${userPrompt}`);
  if (imageNote) context.push(`Attached image shows: ${imageNote}`);
  if (eventCount > 0) context.push(`An existing calendar with ${eventCount} event(s) was also uploaded.`);
  if (context.length === 0) return { title: "New schedule", description: "Imported calendar" };

  try {
    const model = await getChatModel();
    const { object } = await generateObject({ model, schema: Summary, prompt: context.join("\n") });
    return {
      title: object.title.trim() || "New schedule",
      description: object.description.trim() || userPrompt || "Imported calendar",
    };
  } catch {
    return { title: "New schedule", description: userPrompt || "Imported calendar" };
  }
}
