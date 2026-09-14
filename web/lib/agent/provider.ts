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
  // Responses API (`/responses`): required for reasoning models like
  // gpt-5.6-luna, which reject function tools on Chat Completions unless
  // reasoning_effort is disabled. Chat-completions-only proxies (e.g. a
  // self-hosted OpenWebUI instance) won't work with this provider — point
  // the admin settings at a real /responses-capable endpoint instead.
  return provider.responses(settings.model);
}

export async function getVisionModel() {
  const settings = await getSettings();
  if (!settings) {
    throw new NotConfiguredError(
      "No LLM provider configured yet — an admin needs to set one up on the /admin page.",
    );
  }
  const provider = createOpenAI({ baseURL: settings.baseURL, apiKey: settings.apiKey });
  return provider.responses(settings.visionModel || settings.model);
}
