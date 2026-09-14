import ivm from "isolated-vm";
import { NormalizedEventArraySchema, type NormalizedEvent } from "../types";
import { zonedTimeToUtc } from "../timezone";

export interface SandboxInput {
  existingEvents: NormalizedEvent[];
  userPrompt: string;
  imageNote?: string;
  userAnswers: { question: string; answer: string }[];
  now: string;
  /** IANA zone, e.g. "America/Los_Angeles". The agent writes naive local wall-clock times; this is what they're local to. */
  timezone: string;
}

export type SandboxRunResult =
  | { ok: true; events: NormalizedEvent[] }
  | { ok: false; error: string };

const TIMEOUT_MS = 3000;
const MEMORY_LIMIT_MB = 32;

/**
 * Runs agent-authored JS in a fresh isolate per call. The code must define
 * `function generateSchedule(input) { ... return events }` — pure,
 * synchronous, no require/fetch/fs/timers (none of that exists in here).
 * We only ever cross the isolate boundary with a JSON string, so no
 * Reference/ExternalCopy plumbing is needed.
 */
export async function runGenerateSchedule(
  code: string,
  input: SandboxInput,
): Promise<SandboxRunResult> {
  const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB });
  try {
    const context = await isolate.createContext();
    const script = await isolate.compileScript(
      `const __INPUT__ = ${JSON.stringify(input)};\n` +
        `${code}\n` +
        `JSON.stringify(generateSchedule(__INPUT__));`,
    );

    let raw: unknown;
    try {
      raw = await script.run(context, { timeout: TIMEOUT_MS });
    } catch (err) {
      return { ok: false, error: `Sandbox execution error: ${String(err)}` };
    }

    if (typeof raw !== "string") {
      return {
        ok: false,
        error:
          "generateSchedule must return a JSON-serializable array of events (got no string result — did you forget `return`?).",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "generateSchedule's return value was not valid JSON." };
    }

    const validated = NormalizedEventArraySchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: `generateSchedule's return value didn't match the required event shape: ${validated.error.message}`,
      };
    }

    // The agent writes naive wall-clock times local to input.timezone; convert
    // to real UTC instants here so downstream storage/.ics/display is correct
    // regardless of what timezone the model's arithmetic assumed.
    const converted = validated.data.map((event) =>
      event.allDay
        ? event
        : {
            ...event,
            start: zonedTimeToUtc(event.start, input.timezone).toISOString(),
            end: zonedTimeToUtc(event.end, input.timezone).toISOString(),
          },
    );

    return { ok: true, events: converted };
  } catch (err) {
    return { ok: false, error: `Failed to compile/run code: ${String(err)}` };
  } finally {
    isolate.dispose();
  }
}
