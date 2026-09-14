import { z } from "zod";

export const NormalizedEventSchema = z.object({
  title: z.string(),
  start: z.string().describe("ISO 8601 datetime"),
  end: z.string().describe("ISO 8601 datetime"),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  rrule: z
    .string()
    .optional()
    .describe("An RRULE string per RFC 5545, e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"),
});
export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

export const NormalizedEventArraySchema = z.array(NormalizedEventSchema);

export type Role = "admin" | "user";

export interface UserDoc {
  _id?: import("mongodb").ObjectId;
  clerkUserId: string;
  email: string;
  role: Role;
  createdAt: Date;
  /** Opaque secret identifying this user's calendar-subscription feed (calendar apps can't send our bearer token). */
  calendarFeedToken?: string;
}

export interface SettingsDoc {
  _id?: import("mongodb").ObjectId;
  key: "singleton";
  baseURL: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  updatedAt: Date;
}

export type SessionStatus = "running" | "awaiting_input" | "done" | "error";

export interface PendingQuestion {
  type: "choice" | "text";
  question: string;
  options?: string[];
  placeholder?: string;
  // Internal bookkeeping to resume generateText with the matching tool-result.
  toolCallId: string;
  toolName: "askChoice" | "askTextInput";
}

export interface CodeVersion {
  code: string;
  createdAt: Date;
}

export interface AgentSessionDoc {
  _id?: import("mongodb").ObjectId;
  userId: string; // clerkUserId
  status: SessionStatus;
  title: string;
  /** AI-cleaned-up restatement of userPrompt, shown to the user; userPrompt itself is kept verbatim for the agent. */
  description: string;
  userPrompt: string;
  imageNote?: string;
  inputEvents: NormalizedEvent[];
  /** IANA zone captured from the client at creation time, e.g. "America/Los_Angeles". */
  timezone: string;
  // Vercel AI SDK ModelMessage[], stored as plain JSON.
  messages: unknown[];
  codeVersions: CodeVersion[];
  /** All questions the agent asked in its most recent step — it can ask any mix/count of choice and text questions in one turn. */
  pendingQuestions?: PendingQuestion[];
  userAnswers: { question: string; answer: string }[];
  /** How many agent steps have run so far this generation round — caps runaway loops across many /continue calls. */
  stepCount: number;
  /** Human-readable "what's happening right now", shown as generation progress. */
  currentStage?: string;
  /**
   * The events from the most recent successful patchCode call this
   * generation round, kept outside the (per-step) tool-call state so a
   * `finalize` call in a LATER /continue step can still see it — each step
   * runs generateText fresh, so nothing in-memory survives between steps
   * except what's explicitly persisted here. Reset to null at the start of
   * each new round (initializeSession/startRefinement). Using null rather
   * than leaving it undefined so Mongo's $set doesn't silently drop the
   * reset (it drops undefined-valued keys, not null).
   */
  latestPatchedEvents: NormalizedEvent[] | null;
  resultEvents?: NormalizedEvent[];
  resultIcs?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
