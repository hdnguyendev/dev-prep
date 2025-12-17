import Agent from "@/components/Agent.tsx";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useLocation } from "react-router";

/**
 * Interview Prep page - CANDIDATE ONLY
 * Requires Clerk authentication (only candidates use Clerk)
 */
const Interview = () => {
  const location = useLocation();
  const state = (location.state as { questions?: string[]; jobTitle?: string } | undefined) || {};
  const questions =
    state.questions?.filter((q) => q && q.trim().length > 0) ?? [];
  const hasCustomQuestions = questions.length > 0;

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
        <Agent mode={hasCustomQuestions ? "feedback" : "generate"} questions={questions} />
      </SignedIn>
    </>
  );
}

export default Interview;