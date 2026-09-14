import { tool } from "ai";
import { z } from "zod";
import { runGenerateSchedule } from "../sandbox/run";
import { formatInZone } from "../timezone";
import type { NormalizedEvent, CodeVersion } from "../types";

export interface AgentToolState {
  latestValidEvents?: NormalizedEvent[];
  finalizeSummary?: string;
}

/**
 * Builds the agent's tool set for one turn. `codeVersions` is mutated in
 * place (patchCode pushes onto it) and `state` is mutated in place
 * (patchCode/finalize record their results onto it) so the caller can read
 * both back after generateText returns, regardless of how many steps ran.
 *
 * askChoice deliberately has no `execute`: with no way to
 * produce a tool-result, the AI SDK's step loop halts right after the model
 * calls one, which is exactly the "hand this back to a real human" pause we
 * want — the route handler persists the partial conversation and returns.
 */
export function buildTools(opts: {
  inputEvents: NormalizedEvent[];
  userPrompt: string;
  imageNote?: string;
  userAnswers: { question: string; answer: string }[];
  codeVersions: CodeVersion[];
  timezone: string;
  state: AgentToolState;
}) {
  const { inputEvents, userPrompt, imageNote, userAnswers, codeVersions, timezone, state } = opts;

  const readCurrentCode = tool({
    description:
      "Returns the JS code you last submitted via patchCode for this session, or an empty string if you haven't submitted any yet.",
    inputSchema: z.object({}),
    execute: async () => {
      const last = codeVersions[codeVersions.length - 1];
      return last ? last.code : "(no code submitted yet)";
    },
  });

  const patchCode = tool({
    description:
      "Submit the full source of your generateSchedule(input) program. It is executed immediately against the real input and validated; the result tells you the resulting events or a specific error to fix.",
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "Full JS source defining function generateSchedule(input) { ... return events }",
        ),
    }),
    execute: async ({ code }) => {
      codeVersions.push({ code, createdAt: new Date() });
      const result = await runGenerateSchedule(code, {
        existingEvents: inputEvents,
        userPrompt,
        imageNote,
        userAnswers,
        now: formatInZone(new Date(), timezone),
        timezone,
      });
      if (result.ok) {
        state.latestValidEvents = result.events;
        return { ok: true, events: result.events };
      }
      return { ok: false, error: result.error };
    },
  });

  const askChoice = tool({
    description:
      "Ask the user ONE multiple-choice clarifying question. Use only when guessing would likely produce a materially wrong result. " +
      "The UI always offers an 'Other' free-text escape hatch alongside your options, so this is also how to ask something " +
      "open-ended (like a specific date): just give your 2 best-guess options and let 'Other' cover everything else — " +
      "there is no separate free-text tool. " +
      "If you have several separate questions, call this multiple times in the SAME turn — one call per question — " +
      "rather than cramming multiple questions into one, or asking them one at a time across separate turns.",
    inputSchema: z.object({
      question: z.string(),
      options: z.array(z.string()).min(2).max(6),
    }),
  });

  const finalize = tool({
    description:
      "Call once you have a successful patchCode result you're satisfied with, to end the session.",
    inputSchema: z.object({ summary: z.string() }),
    execute: async ({ summary }) => {
      state.finalizeSummary = summary;
      return { ok: true };
    },
  });

  return { readCurrentCode, patchCode, askChoice, finalize };
}

export type AgentTools = ReturnType<typeof buildTools>;
