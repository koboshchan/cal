import { generateText, hasToolCall, stepCountIs, type ModelMessage } from "ai";
import { getChatModel } from "./provider";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { buildTools, type AgentToolState } from "./tools";
import { generateIcs } from "../ics";
import type { AgentSessionDoc } from "../types";

const MAX_STEPS = 8;

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
  lines.push(`Current date/time: ${new Date().toISOString()}`);
  return { role: "user", content: lines.join("\n\n") };
}

/** Mutates `session` in place: messages, codeVersions, status, result*, error. */
export async function runInitialTurn(session: AgentSessionDoc): Promise<void> {
  session.messages = [buildInitialUserMessage(session)];
  await runLoop(session);
}

/** Mutates `session` in place, resuming a paused (awaiting_input) session. */
export async function continueSessionWithAnswer(
  session: AgentSessionDoc,
  answer: string,
): Promise<void> {
  const pending = session.pendingQuestion;
  if (!pending) throw new Error("Session has no pending question");

  session.userAnswers.push({ question: pending.question, answer });
  session.messages.push({
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: pending.toolCallId,
        toolName: pending.toolName,
        output: { type: "json", value: answer },
      },
    ],
  } satisfies ModelMessage);
  session.pendingQuestion = undefined;

  await runLoop(session);
}

async function runLoop(session: AgentSessionDoc): Promise<void> {
  session.status = "running";
  try {
    const model = await getChatModel();
    const state: AgentToolState = {};
    const tools = buildTools({
      inputEvents: session.inputEvents,
      userPrompt: session.userPrompt,
      imageNote: session.imageNote,
      userAnswers: session.userAnswers,
      codeVersions: session.codeVersions,
      state,
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: session.messages as ModelMessage[],
      tools,
      stopWhen: [
        stepCountIs(MAX_STEPS),
        hasToolCall("askChoice"),
        hasToolCall("askTextInput"),
        hasToolCall("finalize"),
      ],
    });

    session.messages = [...session.messages, ...result.response.messages];

    const finalizeCall = result.toolCalls.find((c) => c.toolName === "finalize");
    const askCall = result.toolCalls.find(
      (c) => c.toolName === "askChoice" || c.toolName === "askTextInput",
    );

    if (finalizeCall && state.latestValidEvents) {
      session.resultEvents = state.latestValidEvents;
      session.resultIcs = generateIcs(state.latestValidEvents);
      session.status = "done";
    } else if (finalizeCall) {
      session.status = "error";
      session.error =
        "The agent tried to finish without ever producing a valid schedule. Try rephrasing your request.";
    } else if (askCall) {
      const input = askCall.input as {
        question: string;
        options?: string[];
        placeholder?: string;
      };
      session.pendingQuestion = {
        type: askCall.toolName === "askChoice" ? "choice" : "text",
        question: input.question,
        options: input.options,
        placeholder: input.placeholder,
        toolCallId: askCall.toolCallId,
        toolName: askCall.toolName as "askChoice" | "askTextInput",
      };
      session.status = "awaiting_input";
    } else {
      session.status = "error";
      session.error =
        "The agent didn't reach a result within its step limit. Try rephrasing your request.";
    }
  } catch (err) {
    session.status = "error";
    session.error = err instanceof Error ? err.message : String(err);
  }
  session.updatedAt = new Date();
}
