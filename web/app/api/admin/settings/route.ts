import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { getDb } from "@/lib/mongodb";
import type { SettingsDoc } from "@/lib/types";

function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) return "*".repeat(apiKey.length);
  return `${"*".repeat(apiKey.length - 4)}${apiKey.slice(-4)}`;
}

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    const settings = await db
      .collection<SettingsDoc>("settings")
      .findOne({ key: "singleton" });
    if (!settings) return Response.json({ configured: false });
    return Response.json({
      configured: true,
      baseURL: settings.baseURL,
      apiKey: maskKey(settings.apiKey),
      model: settings.model,
      visionModel: settings.visionModel ?? "",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const PutBody = z.object({
  baseURL: z.string().url(),
  // Optional: omit/empty to keep the existing key unchanged (so the masked
  // value we return from GET is never a valid write-back candidate).
  apiKey: z.string().optional(),
  model: z.string().min(1),
  visionModel: z.string().optional(),
});

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = PutBody.parse(await request.json());
    const db = await getDb();
    const settings = db.collection<SettingsDoc>("settings");

    const existing = await settings.findOne({ key: "singleton" });
    if (!body.apiKey && !existing) {
      return Response.json({ error: "apiKey is required for initial setup" }, { status: 400 });
    }

    await settings.updateOne(
      { key: "singleton" },
      {
        $set: {
          key: "singleton",
          baseURL: body.baseURL,
          ...(body.apiKey ? { apiKey: body.apiKey } : {}),
          model: body.model,
          visionModel: body.visionModel || undefined,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return Response.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
