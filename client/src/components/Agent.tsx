import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";

// Giả sử đường dẫn ảnh vẫn đúng
import clerkFallback from "../assets/clerk.svg";
import logo from "@/assets/logo.svg";

import { vapi } from "@/lib/vapi.sdk";
import { interviewer, interviewer_generate } from "@/constants";
import {
  createFeedback,
  createInterview,
  SavedMessage,
} from "@/lib/actions/general.action";

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

// --- Participant Card UI (Giữ nguyên vì đã đẹp) ---

const ParticipantCard: React.FC<{
  p: Participant;
  active?: boolean;
  index?: number;
}> = ({ p, active = false, index = 0 }) => {
  const isAI = p.role === "ai";
  const initials = p.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const t: number = window.setTimeout(
      () => setVisible(true),
      index * 120 + 80
    );
    return () => window.clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`w-full md:w-1/2 p-4 transition-all duration-500 ${
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
          className={`relative h-[320px] rounded-2xl p-10 flex flex-col items-center justify-center gap-5 transition-transform transform hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(2,6,23,0.65)] ${
            isAI
              ? "bg-gradient-to-b from-[#0f1728] via-[#0b1220] to-[#02040a]"
              : "bg-gradient-to-b from-[#070708] via-[#0b0b0c] to-[#030303]"
          } ${active ? "ring-4 ring-indigo-600/20" : ""}`}
        >
          <div
            className={`relative w-36 h-36 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ${
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
              <div className="w-28 h-28 rounded-full bg-white/95 flex items-center justify-center">
                <img src={logo} alt="AI avatar" />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white tracking-wide">
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
                <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
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

          <div className="text-2xl font-semibold text-gray-100 mt-2 text-center drop-shadow-sm tracking-tight">
            {p.name}
          </div>

          <div className="absolute left-8 right-8 bottom-6 h-0.5 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// --- Agent Component Main ---

interface AgentProps {
  mode?: "generate" | "feedback";
  interviewId?: string;
  feedbackId?: string;
  questions?: string[];
}

const Agent: React.FC<AgentProps> = ({
  mode = "generate",
  interviewId,
  feedbackId,
  questions,
}) => {
  const { user } = useUser();

  const [isCalling, setIsCalling] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [muted, setMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Lấy tin nhắn cuối cùng để hiển thị
  const lastMessage = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages]);

  const participants: Participant[] = useMemo(() => {
    const displayName =
      user?.fullName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress ||
      "You";
    return [
      { id: 1, role: "ai", name: "AI Interviewer" },
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
    };

    const onCallEnd = () => {
      console.log("[Vapi] call-end");
      setIsCalling(false);
      setActiveRole(null);
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
        setMessages((prev) => [...prev, newMessage]);
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
  }, []);

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
      if (mode === "generate") {
        await vapi.start(interviewer_generate, {
          variableValues: {
            username: user?.fullName || user?.username || "You",
            userid: user?.id,
          },
        });
      } else {
        let formattedQuestions = "";
        if (questions && questions.length > 0) {
          formattedQuestions = questions.map((q) => `- ${q}`).join("\n");
        }

        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      }
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

  const handleSaveFeedback = async () => {
    if (!user?.id || !interviewId) return;
    const { success } = await createFeedback({
      interviewId,
      userId: user.id,
      transcript: messages,
      feedbackId,
    });
    console.log("createFeedback:", success);
  };

  const handleGenerateInterview = async () => {
    if (!user?.id) return;
    const res = await createInterview({
      userid: user.id,
      role: "Software Engineer",
      type: "technical",
      level: "entry",
      techstack: "JavaScript, HTML, CSS",
      amount: 5,
    });
    console.log("createInterview:", res);
  };

  return (
    <>
      {/* Định nghĩa animation keyframes ngay trong component */}
      <style>{`
        @keyframes fadeInSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInSlideUp {
          animation: fadeInSlideUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="w-full max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">
          {mode === "generate" ? "Interview Generation" : "Mock Interview"}
        </h2>

        {/* Participant Cards */}
        <div className="flex flex-col md:flex-row gap-6">
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

        <div className="flex flex-col items-center mt-8 gap-4">
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
                {isCalling ? "Live" : "Ready"}
              </div>
              <div className="px-3 text-sm font-mono text-gray-400 border-l border-white/10">
                {isCalling ? formatTime(callSeconds) : "00:00"}
              </div>
            </div>

            <button
              onClick={handleMuteClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 border ${
                muted
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300"
              }`}
              title={muted ? "Unmute" : "Mute"}
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
            </button>
          </div>

          {/* --- LIVE TRANSCRIPT SECTION (NEW) --- */}
          <div className="mt-8 w-full max-w-3xl mx-auto min-h-[160px] flex flex-col justify-end">
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
                        ? "AI Assistant"
                        : "You"}
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
                    ? "Listening..."
                    : "Start the call to begin interview"}
                </p>
              </div>
            )}
          </div>

          {/* Call Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={handleCallClick}
              className={`px-10 py-3 rounded-full text-white font-semibold shadow-2xl transition-all transform active:scale-95 flex items-center gap-3 ${
                isCalling
                  ? "bg-red-500/80 hover:bg-red-600 border border-red-400/50"
                  : "bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/50"
              }`}
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
                  End Session
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
                  Start Call
                </>
              )}
            </button>

            {/* Development Buttons (Feedback/Generate) */}
            {mode === "feedback" && (
              <button
                type="button"
                onClick={handleSaveFeedback}
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
              >
                Save Feedback
              </button>
            )}
            {mode === "generate" && (
              <button
                type="button"
                onClick={handleGenerateInterview}
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
              >
                Gen Interview
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Agent;
