import React, { useEffect, useMemo, useState } from "react";
import clerkFallback from "../assets/clerk.svg";
import { useUser } from "@clerk/clerk-react";
import logo from "@/assets/logo.svg";

type Role = "ai" | "user";

interface Participant {
  id: number;
  role: Role;
  name: string;
  avatarUrl?: string;
}

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
    const t: number = window.setTimeout(() => setVisible(true), index * 120 + 80);
    return () => window.clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`w-full md:w-1/2 p-4 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {/* subtle stroke wrapper */}
      <div className="relative rounded-2xl">
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none ${
            isAI ? "border-[1.5px] border-indigo-400/20" : "border-[1.5px] border-white/10"
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
          {/* Avatar */}
          <div
            className={`relative w-36 h-36 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ${
              isAI ? "bg-gradient-to-br from-indigo-400 to-black-100" : "bg-white/5"
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
                <img src={logo} alt={"avt"}/>
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white tracking-wide">
                {initials}
              </div>
            )}

            {/* active speaker indicator */}
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
                    className={`w-5 h-5 ${isAI ? "text-indigo-700" : "text-emerald-600"}`}
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d="M5 9v6h4l5 4V5L9 9H5z" />
                  </svg>
                </div>
              </>
            )}
          </div>

          {/* Name (was empty before) */}
          <div className="text-2xl font-semibold text-gray-100 mt-2 text-center drop-shadow-sm tracking-tight">
            {p.name}
          </div>

          {/* subtle bottom line */}
          <div className="absolute left-8 right-8 bottom-6 h-0.5 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
};

const Agent: React.FC = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [muted, setMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const { user } = useUser();

  // Build participants from Clerk user (fallback to defaults)
  const participants: Participant[] = useMemo(() => {
    const displayName =
      user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "You";
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

  useEffect(() => {
    let timer: number | undefined;
    if (isCalling) {
      setActiveRole("ai"); // start with AI
      timer = window.setInterval(() => {
        setActiveRole((prev) => (prev === "ai" ? "user" : "ai"));
      }, 3000);
    } else {
      setActiveRole(null);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isCalling]);

  // call timer
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

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Interview Generation</h2>

      <div className="flex flex-col md:flex-row gap-6">
        {participants.map((p, i) => (
          <ParticipantCard key={p.id} p={p} index={i} active={isCalling && activeRole === p.role} />
        ))}
      </div>

      <div className="flex flex-col items-center mt-8 gap-4">
        {/* Call controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isCalling ? "bg-red-400 animate-pulse" : "bg-transparent"
              }`}
              aria-hidden="true"
            />
            <div className="text-sm font-medium">
              {isCalling ? "Live" : "Ready"}
            </div>
            <div className="px-3 text-sm">
              {isCalling ? formatTime(callSeconds) : "00:00"}
            </div>
          </div>

          <button
            onClick={() => setMuted((m) => !m)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              muted ? "bg-white/10 text-amber-300" : "bg-white/5 "
            }`}
            aria-pressed={muted}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            title={muted ? "Unmute" : "Mute"}
            type="button"
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12a4.5 4.5 0 0 0-4.5-4.5v1.5a3 3 0 0 1 3 3 3 3 0 0 1-3 3v1.5a4.5 4.5 0 0 0 4.5-4.5z" />
                <path d="M19 5L5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 9v6h4l5 4V5L9 9H5z" />
              </svg>
            )}
            <span className="text-sm">{muted ? "Muted" : "Mute"}</span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setIsCalling((s) => !s)}
            className={`px-12 py-3 rounded-full text-white font-semibold shadow-2xl transition-transform active:scale-95 flex items-center gap-3 ${
              isCalling ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
            }`}
            aria-pressed={isCalling}
            type="button"
          >
            {isCalling ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
                End Call
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5V13h2v3.5zM11 6h2v6h-2z" />
                </svg>
                Call
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Agent;
