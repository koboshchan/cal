import { generateText } from "ai";
import { getVisionModel } from "./provider";

export interface ImageInput {
  base64: string;
  mediaType: string;
}

/**
 * One-off, non-sandboxed vision call that turns one or more attached images
 * into a single text description (e.g. several photos/pages of the same
 * schedule). The sandbox and the agent's tool loop never see the images
 * themselves — only this text — keeping the sandbox boundary to plain data.
 */
export async function describeImages(images: ImageInput[]): Promise<string> {
  const model = await getVisionModel();
  const result = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              images.length > 1
                ? "These images together show a schedule, calendar, or timetable (e.g. several photos or pages of the same document). Describe all schedule/event information visible across ALL of them in enough plain-text detail to reconstruct it: dates, days of week, start/end times, titles, and locations."
                : "Describe any schedule, calendar, timetable, or event information visible in this image in enough plain-text detail to reconstruct it: dates, days of week, start/end times, titles, and locations.",
          },
          ...images.map(({ base64, mediaType }) => ({ type: "file" as const, mediaType, data: base64 })),
        ],
      },
    ],
  });
  return result.text;
}
