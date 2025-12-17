import type { ApiResponse, Interview, InterviewStatus, InterviewType } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

export type CreatePracticeInterviewInput = {
  applicationId: string;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  accessCode: string;
  expiresAt: string; // ISO
  startedAt?: string; // ISO
};

/**
 * Tạo Interview record cho buổi practice gắn với Application (job).
 */
export async function createPracticeInterview(
  input: CreatePracticeInterviewInput,
  token?: string
): Promise<Interview> {
  const res = await fetch(`${API_BASE}/interviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as ApiResponse<Interview>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to create interview");
  }
  return json.data;
}

export type UpdatePracticeInterviewInput = {
  id: string;
  status?: InterviewStatus;
  endedAt?: string; // ISO
  durationSeconds?: number;
  fullTranscript?: string;
  overallScore?: number;
  summary?: string;
  recommendation?: string;
  aiAnalysisData?: unknown;
};

/**
 * Cập nhật Interview record sau khi kết thúc practice (transcript + feedback).
 */
export async function updatePracticeInterview(
  input: UpdatePracticeInterviewInput,
  token?: string
): Promise<Interview> {
  const { id, ...payload } = input;
  const res = await fetch(`${API_BASE}/interviews/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<Interview>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to update interview");
  }
  return json.data;
}

export type CreateInterviewExchangeInput = {
  interviewId: string;
  orderIndex: number;
  questionText: string;
  questionCategory?: string;
  answerText?: string;
};

/**
 * Lưu từng lượt hỏi-đáp (turn-by-turn) cho interview.
 */
export async function createInterviewExchange(
  input: CreateInterviewExchangeInput,
  token?: string
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/interview-exchanges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as ApiResponse<unknown>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to create interview exchange");
  }
  return json.data;
}


