import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient, type InterviewFeedback } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

const InterviewFeedbackPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const customUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterviewFeedback | null>(null);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const isAuthenticated = Boolean(customUser) || Boolean(isSignedIn);

  const title = useMemo(() => {
    if (!data) return "Interview feedback";
    const candidateName = (data as any).candidate?.name;
    const jobTitle = (data as any).job?.title;
    if (candidateName && jobTitle) {
      return `Interview: ${candidateName} - ${jobTitle}`;
    }
    return `Interview feedback • ${String(data.id).slice(0, 6)}`;
  }, [data]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!id) {
      setError("Missing interview id");
      setLoading(false);
      return;
    }

    try {
      if (!opts?.silent) setLoading(true);
      if (!opts?.silent) setError(null);

      let token: string | undefined;
      try {
        token = (await getToken().catch(() => undefined)) || undefined;
      } catch {
        token = undefined;
      }
      if (!token && customUser) token = customUser.id;

      const res = await apiClient.getInterviewFeedback(id, token);
      if (!res.success) {
        if (!opts?.silent) setError(res.message || "Failed to load feedback");
        if (!opts?.silent) setData(null);
        return;
      }

      setData(res.data);
    } catch {
      if (!opts?.silent) setError("Network error");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for Clerk to load to avoid treating signed-in users as signed-out briefly.
    if (!isLoaded) return;
    setPollCount(0);
    load();
  }, [id, customUser?.id, isLoaded]);

  const isWaitingForFeedback = useMemo(() => {
    if (!data) return true;
    if (data.status !== "COMPLETED") return true;
    if (data.overallScore === null || typeof data.overallScore === "undefined") return true;
    if (!data.aiAnalysisData) return true;
    return false;
  }, [data]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) return;
    if (!id) return;
    if (loading) return;
    if (error) return;
    if (!isWaitingForFeedback) {
      setIsPolling(false);
      return;
    }

    const POLL_MS = 1500;
    const MAX_POLLS = 60; // ~90s
    let cancelled = false;
    let timer: number | undefined;

    setIsPolling(true);

    const tick = async () => {
      if (cancelled) return;
      setPollCount((p) => {
        const next = p + 1;
        if (next >= MAX_POLLS) {
          setIsPolling(false);
          return next;
        }
        return next;
      });

      await load({ silent: true });
      if (cancelled) return;

      // Stop polling after MAX_POLLS.
      if (pollCount + 1 >= MAX_POLLS) return;
      timer = window.setTimeout(tick, POLL_MS);
    };

    timer = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [id, isLoaded, isAuthenticated, isWaitingForFeedback, loading, error]);

  const reEvaluate = async () => {
    if (!id) return;
    try {
      setReEvaluating(true);
      setError(null);

      let token: string | undefined;
      try {
        token = (await getToken().catch(() => undefined)) || undefined;
      } catch {
        token = undefined;
      }
      if (!token && customUser) token = customUser.id;

      await apiClient.analyzeInterview(id, token);
      await load();
    } catch {
      setError("Failed to re-evaluate");
    } finally {
      setReEvaluating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <SignedOut>
          <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
            <Card className="max-w-md">
              <CardHeader>
                <div className="mb-3 flex justify-center">
                  <TriangleAlert className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-center">Login Required</CardTitle>
                <CardDescription className="text-center">Please login to view interview feedback.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-3">
                <Button onClick={() => navigate("/login")} variant="default">
                  Staff Login
                </Button>
                <Button onClick={() => navigate("/login")} variant="outline">
                  Candidate Login
                </Button>
              </CardContent>
            </Card>
          </main>
        </SignedOut>
        <SignedIn>
          {/* Safety fallback; should be rare due to isAuthenticated check */}
          <FeedbackSkeleton title={title} loading />
        </SignedIn>
      </>
    );
  }

  if (loading) return <FeedbackSkeleton title={title} loading />;
  if (error) return <FeedbackSkeleton title={title} error={error} onRetry={load} />;
  if (!data) return <FeedbackSkeleton title={title} error="No data" onRetry={load} />;

  if (isWaitingForFeedback) {
    const shouldStop = pollCount >= 60;
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Generating feedback… page will auto-update when processing is complete.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">
                Status: <span className="font-medium text-foreground">{data.status}</span>
                {isPolling && !shouldStop && <span className="text-muted-foreground"> • updating</span>}
              </div>
            </div>

            {shouldStop && (
              <div className="text-sm text-muted-foreground">
                Taking longer than usual. You can refresh or click "Analyze now".
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => load()} disabled={reEvaluating}>
                Refresh
              </Button>
              <Button variant="outline" onClick={reEvaluate} disabled={reEvaluating}>
                {reEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analyze now
              </Button>
              <Button variant="ghost" onClick={() => navigate("/interviews")}>
                Back to interviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const ai = (data.aiAnalysisData || {}) as any;
  const categoryScores = Array.isArray(ai?.categoryScores) ? (ai.categoryScores as any[]) : [];
  const strengths = Array.isArray(ai?.strengths) ? (ai.strengths as string[]) : [];
  const improvements = Array.isArray(ai?.areasForImprovement) ? (ai.areasForImprovement as string[]) : [];
  const candidateInfo = (data as any).candidate;
  const jobInfo = (data as any).job;

  return (
    <main className="container mx-auto min-h-dvh px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {candidateInfo && jobInfo
                ? `${candidateInfo.name} • ${jobInfo.title}${jobInfo.company ? ` at ${jobInfo.company}` : ""}`
                : "Rule-based evaluation results."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reEvaluate} disabled={reEvaluating}>
            {reEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Re-evaluate
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall</CardTitle>
            <CardDescription>Summary of the evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{data.status}</Badge>
              {data.recommendation && <Badge variant="success">{String(data.recommendation)}</Badge>}
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Score</div>
              <div className="text-3xl font-semibold tracking-tight">{data.overallScore ?? "-"}</div>
            </div>
            {data.summary && (
              <>
                <Separator />
                <div className="text-sm text-muted-foreground">{data.summary}</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Strengths, improvements, and scoring breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="breakdown">
              <TabsList>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                <TabsTrigger value="per-question">Per question</TabsTrigger>
              </TabsList>
              <TabsContent value="breakdown" className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Category scores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {categoryScores.length === 0 ? (
                        <div className="text-muted-foreground">No category scores.</div>
                      ) : (
                        categoryScores.map((c) => (
                          <div key={String(c?.name)} className="flex items-center justify-between gap-3">
                            <div className="truncate">{String(c?.name || "")}</div>
                            <Badge variant="outline">{String(c?.score ?? "-")}/10</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Strengths</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {strengths.length === 0 ? (
                        <div>No strengths found.</div>
                      ) : (
                        <ul className="list-disc space-y-1 pl-4">
                          {strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Areas for improvement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {improvements.length === 0 ? (
                      <div>No improvement areas found.</div>
                    ) : (
                      <ul className="list-disc space-y-1 pl-4">
                        {improvements.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="per-question" className="mt-4 space-y-3">
                {(data.perQuestion || []).map((q) => (
                  <Card key={q.orderIndex}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Q{q.orderIndex}: {q.questionText}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        {q.questionCategory && <Badge variant="outline">{q.questionCategory}</Badge>}
                        <Badge variant="success">{q.score ?? "-"}/10</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {q.feedback ? q.feedback : "No feedback."}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

const FeedbackSkeleton = ({
  title,
  loading,
  error,
  onRetry,
}: {
  title: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) => {
  return (
    <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {loading ? "Loading feedback..." : error ? "There was a problem loading feedback." : "Ready"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{loading ? "Please wait." : error || ""}</div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} disabled={Boolean(loading)}>
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default InterviewFeedbackPage;


