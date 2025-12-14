import Agent from "@/components/Agent.tsx";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

/**
 * Interview Prep page - CANDIDATE ONLY
 * Requires Clerk authentication (only candidates use Clerk)
 */
const Interview = () => {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <Agent />
      </SignedIn>
    </>
  );
}

export default Interview;