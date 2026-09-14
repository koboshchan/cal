import { createOpenAI } from "@ai-sdk/openai";
import { getDb } from "../mongodb";
import type { SettingsDoc } from "../types";

export class NotConfiguredError extends Error {}

export async function getSettings(): Promise<SettingsDoc | null> {
  const db = await getDb();
  return db.collection<SettingsDoc>("settings").findOne({ key: "singleton" });
}

/** Builds a fresh OpenAI-compatible chat model per call from admin-configured settings. */
export async function getChatModel() {
  const settings = await getSettings();
  if (!settings) {
    throw new NotConfiguredError(
      "No LLM provider configured yet — an admin needs to set one up on the /admin page.",
    );
  }
  const provider = createOpenAI({ baseURL: settings.baseURL, apiKey: settings.apiKey });
  return provider(settings.model);
}

export async function getVisionModel() {
  const settings = await getSettings();
  if (!settings) {
    throw new NotConfiguredError(
      "No LLM provider configured yet — an admin needs to set one up on the /admin page.",
    );
  }
  const provider = createOpenAI({ baseURL: settings.baseURL, apiKey: settings.apiKey });
  return provider(settings.visionModel || settings.model);
}
