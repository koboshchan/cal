"use client";

import { useEffect, useState } from "react";

interface Settings {
  configured: boolean;
  baseURL?: string;
  apiKey?: string;
  model?: string;
  visionModel?: string;
}

export default function AdminSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [baseURL, setBaseURL] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [visionModel, setVisionModel] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        if (data.configured) {
          setBaseURL(data.baseURL ?? baseURL);
          setModel(data.model ?? model);
          setVisionModel(data.visionModel ?? "");
          setMaskedKey(data.apiKey ?? null);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseURL,
          apiKey: apiKey || undefined,
          model,
          visionModel: visionModel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setStatus("Saved.");
      setApiKey("");
      const refreshed = await fetch("/api/admin/settings").then((r) => r.json());
      setMaskedKey(refreshed.apiKey ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Base URL (any OpenAI-compatible endpoint)
        <input
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          className="rounded-lg border px-3 py-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        API key {maskedKey && <span className="text-gray-400">(current: {maskedKey})</span>}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={maskedKey ? "Leave blank to keep current key" : ""}
          className="rounded-lg border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Model
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border px-3 py-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Vision model (optional, falls back to Model above)
        <input
          value={visionModel}
          onChange={(e) => setVisionModel(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-green-600">{status}</p>}

      <button type="submit" className="w-fit rounded-lg bg-black px-4 py-2 font-medium text-white">
        Save
      </button>
    </form>
  );
}
