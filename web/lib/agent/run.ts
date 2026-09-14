import { APICallError, generateText, stepCountIs, type ModelMessage } from "ai";
import { getChatModel } from "./provider";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { buildTools, type AgentToolState } from "./tools";
import { generateIcs } from "../ics";
import { formatInZone } from "../timezone";
import type { AgentSessionDoc } from "../types";

const MAX_STEPS = 25;

function buildInitialUserMessage(session: AgentSessionDoc): ModelMessage {
  const lines = [`User's request: "${session.userPrompt}"`];
  if (session.imageNote) {
    lines.push(`They also attached an image; here's a description of it: ${session.imageNote}`);
  }
  if (session.inputEvents.length > 0) {
    lines.push(
      `Their existing calendar has ${session.inputEvents.length} event(s):\n${JSON.stringify(session.inputEvents)}`,
    );
  } else {
    lines.push("They have no existing calendar events.");
  }
  lines.push(`Current date/time where the user is (${session.timezone}): ${formatInZone(new Date(), session.timezone)}`);
  return { role: "user", content: lines.join("\n\n") };
}

/** Sets up a brand-new session's first message. No model call — safe/fast, run inline in the create route. */
export function initializeSession(session: AgentSessionDoc): void {
  session.messages = [buildInitialUserMessage(session)];
  session.status = "running";
  session.stepCount = 0;
  session.currentStage = "Understanding your request…";
  session.latestPatchedEvents = null;
}

/**
 * Mutates `session` in place, resuming a paused (awaiting_input) session
 * with the user's answers — one per pending question, matched by
 * toolCallId (the agent may have asked several questions in one turn). All
 * of them must be answered in a single tool message: they're all
 * tool-results for calls the model made in the same preceding turn, and a
 * model turn can't be "half resolved". Does not
 * itself take an agent step — call `stepSession` afterward (the route
 * handlers do this immediately so the response reflects real progress, and
 * the client's poll loop carries on from there if more steps are needed).
 */
export function answerPendingQuestions(
  session: AgentSessionDoc,
  answers: { toolCallId: string; answer: string }[],
): void {
  const pending = session.pendingQuestions;
  if (!pending || pending.length === 0) throw new Error("Session has no pending questions");

  const content = pending.map((question) => {
    const found = answers.find((a) => a.toolCallId === question.toolCallId);
    if (!found) throw new Error(`Missing an answer for: ${question.question}`);
    session.userAnswers.push({ question: question.question, answer: found.answer });
    return {
      type: "tool-result" as const,
      toolCallId: question.toolCallId,
      toolName: "askChoice" as const,
      output: { type: "json" as const, value: found.answer },
    };
  });

  session.messages.push({ role: "tool", content } satisfies ModelMessage);
  session.pendingQuestions = undefined;
  session.status = "running";
  session.currentStage = "Continuing…";
}

/**
 * Mutates `session` in place: a follow-up edit request on an already-
 * finished (or errored) session — "remove the dentist appointment", "move
 * gym to 6am". Builds on the latest result, not the original upload (see
 * the resultEvents-first fallback in stepSession), so it composes with any
 * earlier refinements or manual event deletions. Resets the step budget —
 * this is a fresh generation round, not a continuation of the last one.
 */
export function startRefinement(session: AgentSessionDoc, prompt: string): void {
  session.messages.push({ role: "user", content: `Follow-up request: ${prompt}` });
  session.status = "running";
  session.stepCount = 0;
  session.currentStage = "Understanding your request…";
  session.latestPatchedEvents = null;
}

/**
 * Performs exactly one agent step (one model turn) and mutates `session` in
 * place. Safe to call repeatedly/idempotently — a no-op unless status is
 * "running" — which is what lets the client just poll this on a timer as
 * its progress-driving mechanism instead of needing a background worker.
 */
export async function stepSession(session: AgentSessionDoc): Promise<void> {
  if (session.status !== "running") return;

  if (session.stepCount >= MAX_STEPS) {
    session.status = "error";
    session.error = "The agent didn't reach a result within its step limit. Try rephrasing your request.";
    session.updatedAt = new Date();
    return;
  }

  try {
    const model = await getChatModel();
    const state: AgentToolState = {};
    const tools = buildTools({
      // The current state of the calendar: prior AI output (including any
      // manual event deletions) if this isn't the first turn, else the
      // originally uploaded .ics.
      inputEvents: session.resultEvents ?? session.inputEvents,
      userPrompt: session.userPrompt,
      imageNote: session.imageNote,
      userAnswers: session.userAnswers,
      codeVersions: session.codeVersions,
      timezone: session.timezone,
      state,
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: stripNullFields(session.messages) as ModelMessage[],
      tools,
      stopWhen: stepCountIs(1),
    });

    session.messages = [...session.messages, ...result.response.messages];
    session.stepCount += 1;

    const finalizeCall = result.toolCalls.find((c) => c.toolName === "finalize");
    const askCalls = result.toolCalls.filter((c) => c.toolName === "askChoice");
    const patchCall = result.toolCalls.find((c) => c.toolName === "patchCode");
    const readCall = result.toolCalls.find((c) => c.toolName === "readCurrentCode");

    if (state.latestValidEvents) {
      session.latestPatchedEvents = state.latestValidEvents;
    }

    if (finalizeCall && session.latestPatchedEvents) {
      session.resultEvents = session.latestPatchedEvents;
      session.resultIcs = generateIcs(session.latestPatchedEvents);
      session.status = "done";
      session.currentStage = "Done";
    } else if (finalizeCall) {
      session.status = "error";
      session.error =
        "The agent tried to finish without ever producing a valid schedule. Try rephrasing your request.";
    } else if (askCalls.length > 0) {
      session.pendingQuestions = askCalls.map((askCall) => {
        const input = askCall.input as { question: string; options: string[] };
        return {
          question: input.question,
          options: input.options,
          toolCallId: askCall.toolCallId,
        };
      });
      session.status = "awaiting_input";
      session.currentStage =
        askCalls.length > 1 ? "Waiting for your answers…" : "Waiting for your answer…";
    } else if (patchCall) {
      const attempt = session.codeVersions.length;
      session.currentStage = state.latestValidEvents
        ? `Checked attempt ${attempt} — looks valid, deciding next step…`
        : `Fixing an issue found in attempt ${attempt}…`;
    } else if (readCall) {
      session.currentStage = "Reviewing the previous attempt…";
    } else if (result.toolCalls.length === 0 && !result.text) {
      // No tool call and no text at all isn't something another step will
      // fix on its own — this is the signature of a model/provider that
      // doesn't actually support function calling, even though the HTTP
      // call itself succeeded (finishReason 'stop' with a fully empty body).
      session.status = "error";
      session.error =
        "The configured model returned an empty response as soon as tools were included in the request " +
        `(finishReason: ${result.finishReason}). This usually means the model doesn't actually support ` +
        "function/tool calling — try a different model in the admin settings.";
    } else {
      session.currentStage = "Thinking…";
    }
  } catch (err) {
    console.error("agent step failed", err);
    session.status = "error";
    session.error = describeError(err);
  }
  session.updatedAt = new Date();
}

/**
 * Some providers (the OpenAI Responses API integration, at least) return
 * message parts with explicit `null` for fields typed `boolean | undefined`
 * (e.g. `providerExecuted: null` on tool-call parts). That round-trips fine
 * as the SDK's own *output*, but once persisted and fed back in as
 * `messages` *input* on the next call, the input schema rejects the `null`
 * — so strip it before every resubmission rather than trusting whatever a
 * given provider happened to hand back.
 */
function stripNullFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripNullFields(v)) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== null) out[k] = stripNullFields(v);
    }
    return out as T;
  }
  return value;
}

function describeError(err: unknown): string {
  if (APICallError.isInstance(err)) {
    const body = err.responseBody?.slice(0, 500);
    return `${err.message} (${err.statusCode} from ${err.url})${body ? `: ${body}` : ""}`;
  }
  return err instanceof Error ? err.message : String(err);
}
