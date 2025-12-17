import Agent from "@/components/Agent.tsx";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useLocation } from "react-router";
import { useEffect } from "react";

/**
 * Interview Prep page - CANDIDATE ONLY
 * Requires Clerk authentication (only candidates use Clerk)
 */
const Interview = () => {
  const { getToken } = useAuth();
  const location = useLocation();
  const state =
    (location.state as { questions?: string[]; jobTitle?: string; applicationId?: string } | undefined) ||
    {};
  const questions =
    state.questions?.filter((q) => q && q.trim().length > 0) ?? [];
  const hasCustomQuestions = questions.length > 0;

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
          jobTitle={state.jobTitle}
          applicationId={state.applicationId}
        />
      </SignedIn>
    </>
  );
}

export default Interview;