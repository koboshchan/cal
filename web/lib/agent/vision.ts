import { generateText } from "ai";
import { getVisionModel } from "./provider";

/**
 * One-off, non-sandboxed vision call that turns an attached image into a
 * text description. The sandbox and the agent's tool loop never see the
 * image itself — only this text — keeping the sandbox boundary to plain data.
 */
export async function describeImage(base64: string, mediaType: string): Promise<string> {
  const model = await getVisionModel();
  const result = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe any schedule, calendar, timetable, or event information visible in this image in enough plain-text detail to reconstruct it: dates, days of week, start/end times, titles, and locations.",
          },
          { type: "file", mediaType, data: base64 },
        ],
      },
    ],
  });
  return result.text;
}
