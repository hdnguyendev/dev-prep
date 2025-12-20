import { useUser } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import logo from "@/assets/logo.svg";
import clerkFallback from "../assets/clerk.svg";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AGENT_UI_TEXT,
  DEFAULT_INTERVIEW_WORKFLOW_VALUES,
  DEFAULT_QUESTION_COUNT,
  INTERVIEW_LEVEL_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  OTHER_OPTION_VALUE,
  interviewer_unified,
  type InterviewWorkflowValues,
  type QuestionMode,
} from "@/constants";
import {
  SavedMessage,
} from "@/lib/actions/general.action";
import { vapi } from "@/lib/vapi.sdk";
import { analyzeInterview, createPracticeInterview, createStandaloneInterview, updatePracticeInterview } from "@/lib/actions/interviews.action";
import type { Interview } from "@/lib/api";
import { createInterviewExchange } from "@/lib/actions/interviews.action";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

// --- Types & Interfaces ---

type Role = "ai" | "user";

interface Participant {
  id: number;
  role: Role;
  name: string;
  avatarUrl?: string;
}

type VapiMessageRole = "user" | "system" | "assistant";

interface VapiMessageBase {
  type: string;
  [key: string]: unknown;
}

interface VapiTranscriptMessage extends VapiMessageBase {
  type: "transcript";
  transcriptType?: string;
  role: VapiMessageRole;
  transcript?: string;
}

type VapiMessage = VapiTranscriptMessage | VapiMessageBase;

type FeedbackJson = {
  totalScore: number;
  categoryScores: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
};

/**
 * Build plain-text transcript from the collected Vapi transcript messages.
 */
function buildFullTranscript(messages: SavedMessage[]): string {
  return messages
    .map((m) => `${m.role}: ${m.content}`.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Extract FEEDBACK_JSON payload from transcript (if assistant emitted it).
 * Expected format: `FEEDBACK_JSON: {...valid json...}`
 */
function extractFeedbackJson(messages: SavedMessage[]): FeedbackJson | null {
  const marker = "FEEDBACK_JSON:";
  const haystack = messages.map((m) => m.content).join("\n");
  const idx = haystack.lastIndexOf(marker);
  if (idx < 0) return null;

  const jsonText = haystack.slice(idx + marker.length).trim();
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText) as FeedbackJson;
  } catch {
    return null;
  }
}

type InterviewTurn = {
  orderIndex: number;
  questionText: string;
  questionCategory: string;
  answerText: string;
};

/**
 * Parse ALL interview turns from transcript messages.
 * Expects assistant questions formatted as:
 * - Main: `Q{n}: ...`
 * - Follow-up: `F{n}: ...`
 */
function extractInterviewTurns(messages: SavedMessage[]): InterviewTurn[] {
  const turnRegex = /^(Q|F)(\d+)\s*:\s*(.+)$/i;
  const turns: InterviewTurn[] = [];

  let current: InterviewTurn | null = null;
  let orderCounter = 0;

  for (const m of messages) {
    if (m.role === "assistant") {
      const match = m.content.trim().match(turnRegex);
      if (match) {
        if (current) turns.push(current);

        orderCounter += 1;
        const prefix = (match[1] || "Q").toUpperCase();
        const num = (match[2] || "").trim();
        const questionText = (match[3] || "").trim();
        const questionCategory = `${prefix}${num || ""}`.trim();

        current = {
          orderIndex: orderCounter,
          questionText,
          questionCategory: questionCategory || prefix,
          answerText: "",
        };
        continue;
      }
    }

    if (m.role === "user" && current) {
      const chunk = m.content.trim();
      if (!chunk) continue;
      current.answerText = current.answerText
        ? `${current.answerText}\n${chunk}`
        : chunk;
    }
  }

  if (current) turns.push(current);

  return turns.filter((t) => t.questionText.length > 0);
}

// --- Participant Card UI (Giữ nguyên vì đã đẹp) ---

function ParticipantCard({
  p,
  active = false,
  index = 0,
}: {
  p: Participant;
  active?: boolean;
  index?: number;
}) {
  const isAI = p.role === "ai";
  const initials = p.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t: number = window.setTimeout(
      () => setVisible(true),
      index * 120 + 80
    );
    return () => window.clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`w-full md:w-1/2 p-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="relative rounded-2xl">
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none ${
            isAI
              ? "border-[1.5px] border-indigo-400/20"
              : "border-[1.5px] border-white/10"
          }`}
          aria-hidden="true"
        />

        <div
          className={`relative h-[260px] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-transform transform hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(2,6,23,0.60)] ${
            isAI
              ? "bg-gradient-to-b from-[#0f1728] via-[#0b1220] to-[#02040a]"
              : "bg-gradient-to-b from-[#070708] via-[#0b0b0c] to-[#030303]"
          } ${active ? "ring-4 ring-indigo-600/20" : ""}`}
        >
          <div
            className={`relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ${
              isAI
                ? "bg-gradient-to-br from-indigo-400 to-black-100"
                : "bg-white/5"
            }`}
          >
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt={`${p.name} avatar`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : isAI ? (
              <div className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center">
                <img src={logo} alt={AGENT_UI_TEXT.participants.aiAvatarAlt} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white tracking-wide">
                {initials}
              </div>
            )}

            {active && (
              <>
                <span
                  className={`absolute -inset-2 rounded-full ${
                    isAI ? "bg-indigo-500/10" : "bg-emerald-400/10"
                  } animate-pulse`}
                />
                <span className="absolute -inset-4 rounded-full border border-white/10 opacity-40 animate-[pulse_1.8s_infinite]" />
                <div className="absolute bottom-1.5 right-1.5 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className={`w-5 h-5 ${
                      isAI ? "text-indigo-700" : "text-emerald-600"
                    }`}
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d="M5 9v6h4l5 4V5L9 9H5z" />
                  </svg>
                </div>
              </>
            )}
          </div>

          <div className="text-lg font-semibold text-gray-100 mt-2 text-center drop-shadow-sm tracking-tight">
            {p.name}
          </div>

          <div className="absolute left-6 right-6 bottom-4 h-0.5 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// --- Agent Component Main ---

interface AgentProps {
  initialQuestions?: string[];
  jobTitle?: string;
  applicationId?: string;
  jobId?: string;
  initialTechstack?: string;
}

function Agent({
  initialQuestions,
  jobTitle,
  applicationId,
  jobId,
  initialTechstack,
}: AgentProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [isCalling, setIsCalling] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [muted, setMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const messagesRef = useRef<SavedMessage[]>([]);
  const persistedInterviewRef = useRef<Interview | null>(null);
  const didPersistOnEndRef = useRef(false);

  const [workflow, setWorkflow] = useState<InterviewWorkflowValues>(() => ({
    ...DEFAULT_INTERVIEW_WORKFLOW_VALUES,
    ...(jobTitle ? { role: jobTitle } : null),
    ...(initialTechstack && initialTechstack.trim().length > 0 ? { techstack: initialTechstack } : null),
  }));

  // If we navigated in with job skills, prefill techstack unless the user already typed something
  useEffect(() => {
    if (!initialTechstack || initialTechstack.trim().length === 0) return;
    setWorkflow((prev) => {
      if (prev.techstack.trim().length > 0) return prev;
      return { ...prev, techstack: initialTechstack };
    });
  }, [initialTechstack]);

  const initialTypeChoice = useMemo(() => {
    const match = INTERVIEW_TYPE_OPTIONS.some((o) => o.value === workflow.type);
    return match ? workflow.type : OTHER_OPTION_VALUE;
  }, [workflow.type]);
  const [typeChoice, setTypeChoice] = useState<string>(initialTypeChoice);
  const [customType, setCustomType] = useState<string>(() =>
    initialTypeChoice === OTHER_OPTION_VALUE ? workflow.type : ""
  );

  const initialLevelChoice = useMemo(() => {
    const match = INTERVIEW_LEVEL_OPTIONS.some((o) => o.value === workflow.level);
    return match ? workflow.level : OTHER_OPTION_VALUE;
  }, [workflow.level]);
  const [levelChoice, setLevelChoice] = useState<string>(initialLevelChoice);
  const [customLevel, setCustomLevel] = useState<string>(() =>
    initialLevelChoice === OTHER_OPTION_VALUE ? workflow.level : ""
  );

  const resolvedType = typeChoice === OTHER_OPTION_VALUE ? customType : typeChoice;
  const resolvedLevel =
    levelChoice === OTHER_OPTION_VALUE ? customLevel : levelChoice;

  useEffect(() => {
    setWorkflow((prev) => ({ ...prev, type: resolvedType }));
  }, [resolvedType]);

  useEffect(() => {
    setWorkflow((prev) => ({ ...prev, level: resolvedLevel }));
  }, [resolvedLevel]);
  const [questionsText, setQuestionsText] = useState(() =>
    (initialQuestions ?? []).join("\n")
  );
  const [questionMode, setQuestionMode] = useState<QuestionMode>(() =>
    (initialQuestions ?? []).length > 0 ? "provided" : "generated"
  );
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);

  const normalizedQuestions = useMemo(() => {
    return questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
  }, [questionsText]);

  const effectiveQuestionCount =
    questionMode === "provided" ? normalizedQuestions.length : questionCount;

  const isWorkflowValid =
    workflow.role.trim().length > 0 &&
    workflow.type.trim().length > 0 &&
    workflow.level.trim().length > 0 &&
    workflow.techstack.trim().length > 0;

  const isStartDisabled =
    !isWorkflowValid ||
    (questionMode === "provided"
      ? normalizedQuestions.length === 0
      : effectiveQuestionCount <= 0);

  const setupSummary = useMemo(() => {
    const parts = [
      workflow.role.trim(),
      workflow.type.trim(),
      workflow.level.trim(),
      workflow.techstack.trim(),
    ].filter((x) => x.length > 0);

    return parts.join(" · ");
  }, [workflow.level, workflow.role, workflow.techstack, workflow.type]);

  const formattedQuestions = useMemo(() => {
    return normalizedQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");
  }, [normalizedQuestions]);

  // Lấy tin nhắn cuối cùng để hiển thị
  const lastMessage = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages]);

  const participants: Participant[] = useMemo(() => {
    const displayName =
      user?.fullName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress ||
      AGENT_UI_TEXT.participants.youFallback;
    return [
      { id: 1, role: "ai", name: AGENT_UI_TEXT.participants.aiName },
      {
        id: 2,
        role: "user",
        name: displayName,
        avatarUrl: user?.imageUrl || clerkFallback,
      },
    ];
  }, [user]);

  /* ----- Vapi event binding ----- */
  useEffect(() => {
    const onCallStart = () => {
      console.log("[Vapi] call-start");
      setIsCalling(true);
      setActiveRole("ai");
      setMessages([]);
      messagesRef.current = [];
      didPersistOnEndRef.current = false;

      // Create Interview record when practice is started from an Application
      (async () => {
        try {
          if (!applicationId) return;
          const token = await getToken().catch(() => undefined);
          let candidateId: string | undefined = undefined;
          try {
            if (token) {
              const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
              const meJson = await meRes.json();
              candidateId = meJson?.candidateProfile?.id ? String(meJson.candidateProfile.id) : undefined;
            }
          } catch {
            // ignore
          }
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const accessCode = crypto.randomUUID().slice(0, 8);
          const title = `Practice: ${jobTitle || workflow.role}`;

          const created = await createPracticeInterview(
            {
              applicationId,
              candidateId,
              jobId,
              title,
              type: "AI_VOICE",
              status: "IN_PROGRESS",
              accessCode,
              expiresAt: expiresAt.toISOString(),
              startedAt: now.toISOString(),
            },
            token ?? undefined
          );

          persistedInterviewRef.current = created;
        } catch (err) {
          console.warn("[Interview] failed to create practice interview:", err);
          persistedInterviewRef.current = null;
        }
      })();

      // Create Interview record for standalone mock interviews (not tied to application)
      ;(async () => {
        try {
          if (applicationId) return;
          const token = await getToken().catch(() => undefined);
          if (!token) return;

          const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          const meJson = await meRes.json();
          const candidateId = meJson?.candidateProfile?.id ? String(meJson.candidateProfile.id) : "";
          if (!candidateId) return;

          const now = new Date();
          const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const accessCode = crypto.randomUUID().slice(0, 8);
          const title = `Mock: ${workflow.role}`;

          const created = await createStandaloneInterview(
            {
              candidateId,
              jobId,
              title,
              type: "AI_VOICE",
              status: "IN_PROGRESS",
              accessCode,
              expiresAt: expiresAt.toISOString(),
              startedAt: now.toISOString(),
            },
            token ?? undefined
          );
          persistedInterviewRef.current = created;
        } catch (err) {
          console.warn("[Interview] failed to create standalone interview:", err);
          persistedInterviewRef.current = null;
        }
      })();
    };

    const onCallEnd = async () => {
      console.log("[Vapi] call-end");
      setIsCalling(false);
      setActiveRole(null);

      // Persist transcript + feedback (if any)
      (async () => {
        try {
          if (didPersistOnEndRef.current) return;
          didPersistOnEndRef.current = true;

          let persisted = persistedInterviewRef.current;

          const token = await getToken().catch(() => undefined);
          const transcript = buildFullTranscript(messagesRef.current);
          const turns = extractInterviewTurns(messagesRef.current);

          // Fallback: nếu call-start chưa tạo được interview thì tạo ngay ở call-end
          if (!persisted) {
            const now = new Date();
            const startedAt = new Date(now.getTime() - callSeconds * 1000);
            const expiresAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            const accessCode = crypto.randomUUID().slice(0, 8);

            if (applicationId) {
              const title = `Practice: ${jobTitle || workflow.role}`;
              persisted = await createPracticeInterview(
                {
                  applicationId,
                  jobId,
                  title,
                  type: "AI_VOICE",
                  status: "IN_PROGRESS",
                  accessCode,
                  expiresAt: expiresAt.toISOString(),
                  startedAt: startedAt.toISOString(),
                },
                token ?? undefined
              );
              persistedInterviewRef.current = persisted;
            } else {
              const token2 = token ?? undefined;
              if (!token2) return;

              const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token2}` } });
              const meJson = await meRes.json();
              const candidateId = meJson?.candidateProfile?.id ? String(meJson.candidateProfile.id) : "";
              if (!candidateId) return;

              const title = `Mock: ${workflow.role}`;
              persisted = await createStandaloneInterview(
                {
                  candidateId,
                  jobId,
                  title,
                  type: "AI_VOICE",
                  status: "IN_PROGRESS",
                  accessCode,
                  expiresAt: expiresAt.toISOString(),
                  startedAt: startedAt.toISOString(),
                },
                token2
              );
              persistedInterviewRef.current = persisted;
            }
          }

          await updatePracticeInterview(
            {
              id: persisted.id,
              status: "PROCESSING",
              endedAt: new Date().toISOString(),
              durationSeconds: callSeconds,
              fullTranscript: transcript,
            },
            token ?? undefined
          );

          // Save Q/A pairs as InterviewExchange (turn-by-turn) in the background
          // so we can navigate to the feedback page immediately.
          void Promise.allSettled(
            turns.map((t) =>
              createInterviewExchange(
                {
                  interviewId: persisted.id,
                  orderIndex: t.orderIndex,
                  questionText: t.questionText,
                  questionCategory: t.questionCategory,
                  answerText: t.answerText,
                },
                token ?? undefined
              )
            )
          );

          // Trigger analysis (async). It will update Interview + per-question scores.
          analyzeInterview(persisted.id, token ?? undefined).catch((err) => {
            console.warn("[Interview] analyze failed:", err);
          });

          // Move user to feedback immediately; the page will show a loading state and auto-refresh.
          navigate(`/interviews/${persisted.id}/feedback`);
        } catch (err) {
          console.warn("[Interview] failed to persist transcript/feedback:", err);
        }
      })();
    };

    const onMessage = (message: VapiMessage) => {
      if (
        message.type === "transcript" &&
        (message as VapiTranscriptMessage).transcriptType === "final"
      ) {
        const m = message as VapiTranscriptMessage;
        const newMessage: SavedMessage = {
          role: m.role,
          content: m.transcript ?? "",
        };
        setMessages((prev) => {
          const next = [...prev, newMessage];
          messagesRef.current = next;
          return next;
        });
      }
    };

    const onSpeechStart = () => {
      console.log("[Vapi] speech-start");
      setIsAiSpeaking(true);
      setActiveRole("ai");
    };

    const onSpeechEnd = () => {
      console.log("[Vapi] speech-end");
      setIsAiSpeaking(false);
      setActiveRole("user");
    };

    const onError = (error: Error) => {
      console.error("[Vapi] error:", error);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [applicationId, callSeconds, getToken, jobTitle, workflow.role]);

  /* ----- Call timer ----- */
  useEffect(() => {
    let t: number | undefined;
    if (isCalling) {
      t = window.setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => {
      if (t) window.clearInterval(t);
    };
  }, [isCalling]);

  const formatTime = (secs: number) => {
    const mm = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const ss = (secs % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  /* ----- Start / Stop Call ----- */
  const handleCallClick = async () => {
    if (isCalling) {
      vapi.stop();
      return;
    }

    try {
      if (isStartDisabled) return;

      await vapi.start(interviewer_unified, {
        variableValues: {
          username:
            user?.fullName ||
            user?.username ||
            AGENT_UI_TEXT.participants.youFallback,
          userid: user?.id,
          role: workflow.role,
          type: workflow.type,
          level: workflow.level,
          techstack: workflow.techstack,
          questionMode,
          questionCount: effectiveQuestionCount,
          questions: questionMode === "provided" ? formattedQuestions : "",
        },
      });
    } catch (err) {
      console.error("Error starting Vapi call:", err);
    }
  };

  const handleMuteClick = () => {
    const next = !muted;
    setMuted(next);
    try {
      vapi.setMuted(next);
    } catch (err) {
      console.error("Error setting mute:", err);
    }
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">
          {AGENT_UI_TEXT.headings.unified}
        </h2>

        {/* Setup: toggleable modal */}
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {AGENT_UI_TEXT.workflow.setupSummaryLabel}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {setupSummary || AGENT_UI_TEXT.workflow.title}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSetupOpen(true)}
            disabled={isCalling}
          >
            {AGENT_UI_TEXT.workflow.setupButton}
          </Button>
        </div>

        <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[80rem] max-h-[96vh] overflow-y-auto gap-6 p-6 sm:p-10 shadow-2xl sm:rounded-2xl break-words">
            <DialogHeader>
              <DialogTitle className="break-words">
                {AGENT_UI_TEXT.workflow.setupModalTitle}
              </DialogTitle>
              <DialogDescription className="break-words">
                {AGENT_UI_TEXT.workflow.setupModalDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent-role">{AGENT_UI_TEXT.workflow.roleLabel}</Label>
                <Input
                  id="agent-role"
                  value={workflow.role}
                  onChange={(e) =>
                    setWorkflow((prev) => ({ ...prev, role: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-type">{AGENT_UI_TEXT.workflow.typeLabel}</Label>
                <Tabs
                  value={typeChoice}
                  onValueChange={(v) => setTypeChoice(v)}
                >
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {INTERVIEW_TYPE_OPTIONS.map((o) => (
                      <TabsTrigger key={o.value} value={o.value}>
                        {o.label}
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value={OTHER_OPTION_VALUE}>
                      {AGENT_UI_TEXT.workflow.otherOptionLabel}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={OTHER_OPTION_VALUE}>
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="agent-custom-type">
                        {AGENT_UI_TEXT.workflow.customTypeLabel}
                      </Label>
                      <Input
                        id="agent-custom-type"
                        value={customType}
                        placeholder={AGENT_UI_TEXT.workflow.customTypePlaceholder}
                        onChange={(e) => setCustomType(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-level">{AGENT_UI_TEXT.workflow.levelLabel}</Label>
                <Tabs
                  value={levelChoice}
                  onValueChange={(v) => setLevelChoice(v)}
                >
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {INTERVIEW_LEVEL_OPTIONS.map((o) => (
                      <TabsTrigger key={o.value} value={o.value}>
                        {o.label}
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value={OTHER_OPTION_VALUE}>
                      {AGENT_UI_TEXT.workflow.otherOptionLabel}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={OTHER_OPTION_VALUE}>
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="agent-custom-level">
                        {AGENT_UI_TEXT.workflow.customLevelLabel}
                      </Label>
                      <Input
                        id="agent-custom-level"
                        value={customLevel}
                        placeholder={AGENT_UI_TEXT.workflow.customLevelPlaceholder}
                        onChange={(e) => setCustomLevel(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-techstack">
                  {AGENT_UI_TEXT.workflow.techstackLabel}
                </Label>
                <Input
                  id="agent-techstack"
                  value={workflow.techstack}
                  onChange={(e) =>
                    setWorkflow((prev) => ({
                      ...prev,
                      techstack: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{AGENT_UI_TEXT.workflow.questionModeLabel}</Label>
                <Tabs
                  value={questionMode}
                  onValueChange={(v) => setQuestionMode(v as QuestionMode)}
                >
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    <TabsTrigger value="provided">
                      {AGENT_UI_TEXT.workflow.questionModeProvided}
                    </TabsTrigger>
                    <TabsTrigger value="generated">
                      {AGENT_UI_TEXT.workflow.questionModeGenerated}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="provided">
                    <div className="space-y-2">
                      <Label htmlFor="agent-questions">
                        {AGENT_UI_TEXT.workflow.questionsLabel}
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {AGENT_UI_TEXT.workflow.questionsHelper}
                      </div>
                      <Textarea
                        id="agent-questions"
                        value={questionsText}
                        placeholder={AGENT_UI_TEXT.workflow.questionsPlaceholder}
                        onChange={(e) => setQuestionsText(e.target.value)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="generated">
                    <div className="space-y-2">
                      <Label htmlFor="agent-question-count">
                        {AGENT_UI_TEXT.workflow.questionCountLabel}
                      </Label>
                      <Input
                        id="agent-question-count"
                        inputMode="numeric"
                        value={String(questionCount)}
                        onChange={(e) =>
                          setQuestionCount(Number(e.target.value || 0))
                        }
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsSetupOpen(false)}>
                {AGENT_UI_TEXT.workflow.setupModalClose}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Participant Cards */}
        <div className="flex flex-col md:flex-row gap-4">
          {participants.map((p, i) => (
            <ParticipantCard
              key={p.id}
              p={p}
              index={i}
              active={
                isCalling &&
                activeRole === p.role &&
                (p.role !== "ai" || isAiSpeaking)
              }
            />
          ))}
        </div>

        <div className="flex flex-col items-center mt-6 gap-4">
          {/* Call Controls & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isCalling ? "bg-red-400 animate-pulse" : "bg-emerald-500/50"
                }`}
                aria-hidden="true"
              />
              <div className="text-sm font-medium text-gray-200">
                {isCalling ? AGENT_UI_TEXT.status.live : AGENT_UI_TEXT.status.ready}
              </div>
              <div className="px-3 text-sm font-mono text-gray-400 border-l border-white/10">
                {isCalling ? formatTime(callSeconds) : "00:00"}
              </div>
            </div>

            <Button
              onClick={handleMuteClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 border ${
                muted
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300"
              }`}
              title={muted ? AGENT_UI_TEXT.controls.unmute : AGENT_UI_TEXT.controls.mute}
              type="button"
              variant="ghost"
            >
              {muted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.5 12a4.5 4.5 0 0 0-4.5-4.5v1.5a3 3 0 0 1 3 3 3 3 0 0 1-3 3v1.5a4.5 4.5 0 0 0 4.5-4.5z" />
                  <path
                    d="M19 5L5 19"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5 9v6h4l5 4V5L9 9H5z" />
                </svg>
              )}
            </Button>
          </div>

          {/* --- LIVE TRANSCRIPT SECTION (NEW) --- */}
          <div className="mt-6 w-full max-w-3xl mx-auto min-h-[140px] flex flex-col justify-end">
            {lastMessage ? (
              <div className="relative group">
                {/* Viền phát sáng mờ (Giữ lại để tạo điểm nhấn cho nền đen) */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>

                {/* Khung nội dung: Đã đổi thành nền đen đặc (bg-black) */}
                <div className="relative bg-black rounded-xl p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center">
                  <p
                    key={lastMessage.content}
                    // Đã đổi màu chữ thành trắng (text-white) cho cả 2 role
                    className="text-lg md:text-xl font-medium leading-relaxed animate-fadeInSlideUp text-white"
                  >
                    {/* Label nhỏ phía trên: Màu xám để không tranh chấp với nội dung chính */}
                    <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-3 font-bold">
                      {lastMessage.role === "assistant"
                        ? AGENT_UI_TEXT.transcript.aiLabel
                        : AGENT_UI_TEXT.transcript.youLabel}
                    </span>

                    {lastMessage.content}
                  </p>
                </div>
              </div>
            ) : (
              // Placeholder khi chưa có hội thoại
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 border border-white/10 rounded-xl bg-black">
                <p className="text-sm italic">
                  {isCalling
                    ? AGENT_UI_TEXT.status.listening
                    : AGENT_UI_TEXT.status.startToBegin}
                </p>
              </div>
            )}
          </div>

          {/* Call Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={handleCallClick}
              className={`px-10 py-3 rounded-full text-white font-semibold shadow-2xl transition-all transform active:scale-95 flex items-center gap-3 ${
                isCalling
                  ? "bg-red-500/80 hover:bg-red-600 border border-red-400/50"
                  : "bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/50"
              }`}
              type="button"
              variant="ghost"
              disabled={!isCalling && isStartDisabled}
            >
              {isCalling ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  {AGENT_UI_TEXT.controls.endSession}
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5V13h2v3.5zM11 6h2v6h-2z" />
                  </svg>
                  {AGENT_UI_TEXT.controls.startCall}
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}

export default Agent;
