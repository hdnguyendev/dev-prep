// src/lib/actions/general.action.ts

export type MessageRole = "user" | "system" | "assistant";

export interface SavedMessage {
  role: MessageRole;
  content: string;
}

/* ---------- FEEDBACK ---------- */

export interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: SavedMessage[];
  feedbackId?: string;
}

export interface CreateFeedbackResponse {
  success: boolean;
  feedbackId?: string;
}

/**
 * Gửi transcript lên backend để chấm điểm & lưu feedback.
 * Backend cần có route POST /api/feedback
 */
export async function createFeedback(
  params: CreateFeedbackParams
): Promise<CreateFeedbackResponse> {
  const apiBase =
    process.env.VITE_API_BASE_URL ??
    "http://localhost:3000";

  try {
    const res = await fetch(`${apiBase}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      credentials: "include",
    });

    if (!res.ok) {
      console.error("Failed to create feedback:", res.status, await res.text());
      return { success: false };
    }

    const data = (await res.json()) as CreateFeedbackResponse;
    return data;
  } catch (err) {
    console.error("Error calling /api/feedback:", err);
    return { success: false };
  }
}

/* ---------- INTERVIEW ---------- */

export interface CreateInterviewParams {
  userid: string;
  role: string;
  type: string;
  level: string;
  techstack: string;
  amount: number;
}

// tuỳ backend trả gì, tạm cho là unknown
export type CreateInterviewResponse = unknown;

/**
 * Gửi yêu cầu tạo bộ câu hỏi interview tới backend (giống /api/vapi/generate cũ).
 */
export async function createInterview(
  params: CreateInterviewParams
): Promise<CreateInterviewResponse> {
  const apiBase =
    process.env.VITE_API_BASE_URL ??
    "http://localhost:3000";

  const res = await fetch(`${apiBase}/api/vapi/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    credentials: "include",
  });

  if (!res.ok) {
    console.error("Failed to create interview:", res.status, await res.text());
    throw new Error("Failed to create interview");
  }

  const data = (await res.json()) as CreateInterviewResponse;
  return data;
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
