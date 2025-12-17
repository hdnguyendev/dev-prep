// src/lib/actions/general.action.ts

export type MessageRole = "user" | "system" | "assistant";

export interface SavedMessage {
  role: MessageRole;
  content: string;
}

/* ---------- OPTIONAL TYPES CHO INTERVIEW / FEEDBACK ---------- */

export interface Interview {
  id: string;
  userId: string;
  role: string;
  type: string;
  techstack: string[] | string;
  level: string;
  questions?: string[];
  finalized?: boolean;
  createdAt: string;
}

export interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  categoryScores: unknown;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}
