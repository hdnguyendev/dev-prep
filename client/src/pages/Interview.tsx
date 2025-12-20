import Agent from "@/components/Agent.tsx";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useLocation } from "react-router";
import { useEffect, useMemo, useState } from "react";

/**
 * Interview Prep page - CANDIDATE ONLY
 * Requires Clerk authentication (only candidates use Clerk)
 */
const Interview = () => {
  const { getToken } = useAuth();
  const location = useLocation();
  const state =
    (location.state as { questions?: string[]; jobTitle?: string; applicationId?: string; jobId?: string } | undefined) ||
    {};
  const questions =
    state.questions?.filter((q) => q && q.trim().length > 0) ?? [];
  const hasCustomQuestions = questions.length > 0;
  const [jobTechstack, setJobTechstack] = useState<string>("");
  const [resolvedJobTitle, setResolvedJobTitle] = useState<string | undefined>(state.jobTitle);
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";

  // Sync candidate profile to backend using Clerk token
  useEffect(() => {
    const syncCandidate = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:9999"}/auth/sync-candidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Failed to sync candidate", err);
      }
    };
    syncCandidate();
  }, [getToken]);

  // Prefill techstack from Job skills (if jobId is provided)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!state.jobId) return;
      try {
        const token = await getToken().catch(() => undefined);
        const res = await fetch(`${apiBase}/jobs/${state.jobId}?include=skills`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.success) return;

        const job = data.data as any;
        const skills = Array.isArray(job?.skills) ? (job.skills as any[]) : [];
        const names = skills
          .map((it) => (it?.skill?.name as string | undefined) ?? "")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        setJobTechstack(names.join(", "));
        if (!resolvedJobTitle && typeof job?.title === "string") {
          setResolvedJobTitle(job.title);
        }
      } catch (err) {
        console.error("Failed to prefill job skills", err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, getToken, resolvedJobTitle, state.jobId]);

  const effectiveJobTitle = useMemo(() => state.jobTitle ?? resolvedJobTitle, [resolvedJobTitle, state.jobTitle]);

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        {hasCustomQuestions && (
          <div className="mx-auto max-w-4xl px-4 pb-4 pt-6">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h1 className="text-xl font-semibold">
                Practice for {state.jobTitle || "this role"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {questions.length} recruiter-provided questions will be used.
              </p>
            </div>
          </div>
        )}
        <Agent
          initialQuestions={questions}
          jobTitle={effectiveJobTitle}
          applicationId={state.applicationId}
          jobId={state.jobId}
          initialTechstack={jobTechstack}
        />
      </SignedIn>
    </>
  );
}

export default Interview;