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
  userPrompt: string;
  imageNote?: string;
  inputEvents: NormalizedEvent[];
  // Vercel AI SDK ModelMessage[], stored as plain JSON.
  messages: unknown[];
  codeVersions: CodeVersion[];
  pendingQuestion?: PendingQuestion;
  userAnswers: { question: string; answer: string }[];
  resultEvents?: NormalizedEvent[];
  resultIcs?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
