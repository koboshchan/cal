import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getDb } from "@/lib/mongodb";
import { parseIcs } from "@/lib/ics";
import { describeImage } from "@/lib/agent/vision";
import { summarizeRequest } from "@/lib/agent/summarize";
import { initializeSession } from "@/lib/agent/run";
import { serializeSessionDetail } from "@/lib/sessions";
import type { AgentSessionDoc } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const sessions = await db
      .collection<AgentSessionDoc>("sessions")
      .find({ userId: user.clerkUserId })
      .sort({ createdAt: -1 })
      .project<{ _id: import("mongodb").ObjectId; title: string; status: string; createdAt: Date }>(
        { title: 1, status: 1, createdAt: 1 },
      )
      .toArray();
    return Response.json({
      sessions: sessions.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const userPrompt = String(form.get("textPrompt") ?? "").trim();
    const icsFile = form.get("icsFile");
    const imageFile = form.get("imageFile");
    const timezone = validTimezone(String(form.get("timezone") ?? ""));

    if (!userPrompt && !icsFile) {
      return Response.json(
        { error: "Provide at least a text prompt or an .ics file" },
        { status: 400 },
      );
    }

    let inputEvents: AgentSessionDoc["inputEvents"] = [];
    if (icsFile instanceof File) {
      const text = await icsFile.text();
      inputEvents = parseIcs(text);
    }

    let imageNote: string | undefined;
    if (imageFile instanceof File) {
      const buf = Buffer.from(await imageFile.arrayBuffer());
      imageNote = await describeImage(
        buf.toString("base64"),
        imageFile.type || "image/png",
      );
    }

    const summary = await summarizeRequest({ userPrompt, imageNote, eventCount: inputEvents.length });

    const now = new Date();
    const session: AgentSessionDoc = {
      userId: user.clerkUserId,
      status: "running",
      title: summary.title,
      description: summary.description,
      userPrompt,
      imageNote,
      inputEvents,
      timezone,
      messages: [],
      codeVersions: [],
      userAnswers: [],
      stepCount: 0,
      latestPatchedEvents: null,
      createdAt: now,
      updatedAt: now,
    };
    initializeSession(session);

    const db = await getDb();
    const { insertedId } = await db.collection<AgentSessionDoc>("sessions").insertOne(session);
    return Response.json(serializeSessionDetail({ ...session, _id: insertedId }));
  } catch (err) {
    return handleApiError(err);
  }
}

function validTimezone(name: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: name });
    return name;
  } catch {
    return "UTC";
  }
}
