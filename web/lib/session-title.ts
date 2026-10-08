import { z } from "zod";

export const SessionTitleSchema = z.string().trim().min(1, "Enter a calendar name").max(120, "Calendar names must be 120 characters or fewer");
