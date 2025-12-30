import Agent from "@/components/Agent.tsx";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useLocation, useSearchParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMembership } from "@/hooks/useMembership";
import { Badge } from "@/components/ui/badge";

/**
 * Interview Prep page - CANDIDATE ONLY
 * Requires Clerk authentication (only candidates use Clerk)
 * Supports access code from query param or manual input
 */
const Interview = () => {
  const { getToken } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { membershipStatus, isVIP } = useMembership();
  const state =
    (location.state as { questions?: string[]; jobTitle?: string; applicationId?: string; jobId?: string } | undefined) ||
    {};
  const questions = useMemo(
    () => state.questions?.filter((q) => q && q.trim().length > 0) ?? [],
    [state.questions]
  );
  const [jobTechstack, setJobTechstack] = useState<string>("");
  const [resolvedJobTitle, setResolvedJobTitle] = useState<string | undefined>(state.jobTitle);
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:9999";

  // Mode selection: "code" (enter code) or "practice" (free practice)
  const modeFromUrl = searchParams.get("mode") || (searchParams.get("accessCode") ? "code" : null);
  const [mode, setMode] = useState<"code" | "practice">(modeFromUrl === "code" ? "code" : "practice");
  
  // Access code handling
  const accessCodeFromUrl = searchParams.get("accessCode");
  const [accessCodeInput, setAccessCodeInput] = useState<string>(accessCodeFromUrl || "");
  const [loadingInterview, setLoadingInterview] = useState<boolean>(!!accessCodeFromUrl);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [startPractice, setStartPractice] = useState<boolean>(false);
  const [interviewData, setInterviewData] = useState<{
    id: string;
    applicationId?: string | null;
    jobId?: string | null;
    job?: {
      id: string;
      title: string;
      interviewQuestions?: string[];
      skills?: Array<{ skill?: { name: string } }>;
    };
    title: string;
    status: string;
    expired?: boolean;
    completed?: boolean;
  } | null>(null);

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
      } catch {
      }
    };
    syncCandidate();
  }, [getToken]);

  // Load interview by access code
  useEffect(() => {
    if (!accessCodeFromUrl) return;
    
    const loadInterview = async () => {
      setLoadingInterview(true);
      setInterviewError(null);
      try {
        const res = await fetch(`${apiBase}/interviews/access-code/${encodeURIComponent(accessCodeFromUrl)}`);
        const data = await res.json();
        
        if (!data.success) {
          setInterviewError(data.message || "Interview not found");
          setLoadingInterview(false);
          return;
        }

        if (data.data.alreadyCompleted) {
          setInterviewError(data.message || "This interview has already been completed. The application status is already INTERVIEWED.");
          setLoadingInterview(false);
          return;
        }

        if (data.data.expired) {
          setInterviewError("Interview has expired");
          setLoadingInterview(false);
          return;
        }

        if (data.data.completed) {
          setInterviewError("Interview has been completed");
          setLoadingInterview(false);
          return;
        }

        setInterviewData(data.data);
        
        // Load job questions if available
        if (data.data.job?.interviewQuestions && data.data.job.interviewQuestions.length > 0) {
          // Questions will be passed to Agent component
        }
        
        // Load job techstack
        if (data.data.jobId) {
          const jobRes = await fetch(`${apiBase}/jobs/${data.data.jobId}?include=skills`);
          const jobData = await jobRes.json();
          if (jobData.success && jobData.data) {
            const skills = Array.isArray(jobData.data.skills) ? jobData.data.skills : [];
            const names = skills
              .map((it: { skill?: { name?: string } }) => it?.skill?.name as string | undefined ?? "")
              .map((n: string) => n.trim())
              .filter((n: string) => n.length > 0);
            setJobTechstack(names.join(", "));
            if (!resolvedJobTitle && jobData.data.title) {
              setResolvedJobTitle(jobData.data.title);
            }
          }
        }
      } catch {
        setInterviewError("Error loading interview information");
      } finally {
        setLoadingInterview(false);
      }
    };

    loadInterview();
  }, [accessCodeFromUrl, apiBase, resolvedJobTitle]);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCodeInput.trim().toUpperCase();
    if (!code) return;
    setMode("code");
    setSearchParams({ accessCode: code, mode: "code" });
  };

  const handleStartPractice = () => {
    setMode("practice");
    setStartPractice(true);
    setSearchParams({ mode: "practice" });
  };

  // Prefill techstack from Job skills (if jobId is provided and not from interview)
  useEffect(() => {
    if (interviewData?.jobId) return; // Already loaded in interview effect
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

        const job = data.data as { skills?: Array<{ skill?: { name?: string } }>; title?: string };
        const skills = Array.isArray(job?.skills) ? job.skills : [];
        const names = skills
          .map((it) => (it?.skill?.name as string | undefined) ?? "")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        setJobTechstack(names.join(", "));
        if (!resolvedJobTitle && typeof job?.title === "string") {
          setResolvedJobTitle(job.title);
        }
      } catch {
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, getToken, resolvedJobTitle, state.jobId, interviewData]);

  const effectiveJobTitle = useMemo(() => {
    if (interviewData?.job?.title) return interviewData.job.title;
    return state.jobTitle ?? resolvedJobTitle;
  }, [resolvedJobTitle, state.jobTitle, interviewData]);

  const effectiveQuestions = useMemo(() => {
    if (interviewData?.job?.interviewQuestions && interviewData.job.interviewQuestions.length > 0) {
      return interviewData.job.interviewQuestions;
    }
    return questions;
  }, [questions, interviewData]);

  const effectiveApplicationId = useMemo(() => {
    return interviewData?.applicationId || state.applicationId;
  }, [interviewData, state.applicationId]);

  const effectiveJobId = useMemo(() => {
    return interviewData?.jobId || state.jobId;
  }, [interviewData, state.jobId]);

  const hasEffectiveQuestions = effectiveQuestions.length > 0;

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        {/* Mode Selection Screen (if no access code in URL, no interview data, and no state.applicationId) */}
        {!accessCodeFromUrl && !interviewData && !state.applicationId && !startPractice && (
          <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
            <Card className="w-full max-w-2xl">
              <CardHeader className="px-4 sm:px-6 pt-6">
                <CardTitle className="text-center text-xl sm:text-2xl">Select Interview Mode</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <Tabs value={mode} onValueChange={(v) => setMode(v as "code" | "practice")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-auto sm:h-12 bg-muted">
                    <TabsTrigger 
                      value="code" 
                      className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-3 sm:py-2.5 px-3 sm:px-4 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-0 dark:data-[state=active]:bg-background"
                    >
                      <Key className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Interview with Access Code</span>
                      <span className="sm:hidden">Access Code</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="practice" 
                      className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-3 sm:py-2.5 px-3 sm:px-4 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-0 dark:data-[state=active]:bg-background"
                    >
                      <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Practice Interview</span>
                      <span className="sm:hidden">Practice</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="code" className="space-y-4 mt-4 sm:mt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Join scheduled interview</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Enter the access code that the recruiter sent via email to join the official interview.
                      </p>
                    </div>

                    {/* How to get access code guide */}
                    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 to-cyan-50/20 dark:from-blue-950/10 dark:to-cyan-950/10">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                              <Mail className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">How to get your access code:</p>
                            </div>
                            <ol className="text-xs sm:text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
                              <li>Check your email inbox for the interview invitation</li>
                              <li>Look for an email from the recruiter with subject "Interview Access Code"</li>
                              <li>Find the 8-character access code in the email (e.g., A1B2C3D4)</li>
                              <li>Enter the code below to start your interview</li>
                            </ol>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                      <div>
                        <Input
                          type="text"
                          placeholder="Enter access code (e.g., A1B2C3D4)"
                          value={accessCodeInput}
                          onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                          className="text-center text-base sm:text-lg tracking-wider h-11 sm:h-12"
                          maxLength={8}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-10 sm:h-11">
                        <Key className="h-4 w-4 mr-2" />
                        Start Interview
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="practice" className="space-y-4 mt-4 sm:mt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Practice interview</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Practice interviewing with AI to prepare for real interviews. You can freely choose topics and questions.
                      </p>
                    </div>
                    
                    {/* Membership Status for Practice Interviews */}
                    {membershipStatus && !isVIP && membershipStatus.usage.interviewsLimit !== null && (
                      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">
                                  Practice Interviews Remaining
                                </p>
                                <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">This week</p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-blue-600 text-white text-sm sm:text-base px-2 sm:px-3 py-1 w-fit sm:w-auto">
                              {membershipStatus.usage.interviewsRemaining ?? 0} / {membershipStatus.usage.interviewsLimit}
                            </Badge>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, ((membershipStatus.usage.interviewsRemaining ?? 0) / membershipStatus.usage.interviewsLimit!) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {membershipStatus.usage.interviewsRemaining === 0 && (
                            <Alert className="mt-3 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-xs text-orange-800 dark:text-orange-300">
                                You've reached your weekly limit. <a href="/candidate/membership" className="font-semibold underline">Upgrade to VIP</a> for unlimited practice interviews.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {isVIP && (
                      <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
                              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-white fill-white" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                                VIP Member
                              </p>
                              <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300">
                                Unlimited practice interviews available
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button 
                      onClick={handleStartPractice} 
                      className="w-full h-10 sm:h-11" 
                      size="lg"
                      disabled={!isVIP && membershipStatus?.usage.interviewsRemaining === 0}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Practice
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading Interview */}
        {loadingInterview && (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading interview information...</p>
            </div>
          </div>
        )}

        {/* Interview Error */}
        {interviewError && !loadingInterview && (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>{interviewError}</AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchParams({});
                    setAccessCodeInput("");
                    setInterviewError(null);
                    setInterviewData(null);
                  }}
                  className="w-full"
                >
                  Enter access code again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Interview Content */}
        {!loadingInterview && !interviewError && (interviewData || state.applicationId || startPractice) && (
          <>
            {hasEffectiveQuestions && (
              <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-4 pt-4 sm:pt-6">
                <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-sm">
                  <div className="flex items-start sm:items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <h1 className="text-base sm:text-xl font-semibold">
                      {interviewData?.title || `Practice for ${effectiveJobTitle || "this role"}`}
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {effectiveQuestions.length} questions from recruiter will be used in this interview.
                  </p>
                </div>
              </div>
            )}
            <Agent
              initialQuestions={effectiveQuestions}
              jobTitle={effectiveJobTitle}
              applicationId={effectiveApplicationId}
              jobId={effectiveJobId}
              initialTechstack={jobTechstack}
              interviewId={interviewData?.id} // Pass existing interview ID when joining via access code
            />
          </>
        )}
      </SignedIn>
    </>
  );
}

export default Interview;