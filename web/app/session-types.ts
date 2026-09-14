import type { NormalizedEvent, PendingQuestion, SessionStatus } from "@/lib/types";

export interface SessionData {
  id: string;
  status: SessionStatus;
  title: string;
  description: string;
  userPrompt: string;
  currentStage?: string;
  pendingQuestion?: PendingQuestion;
  resultEvents?: NormalizedEvent[];
  error?: string;
}
