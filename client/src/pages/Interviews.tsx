import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, type Interview } from "@/lib/api";
import { useApiList } from "@/lib/hooks/useApiList";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

const statusColor: Record<Interview["status"], "default" | "outline" | "success"> = {
  PENDING: "outline",
  IN_PROGRESS: "default",
  PROCESSING: "outline",
  COMPLETED: "success",
  FAILED: "outline",
  EXPIRED: "outline",
};

const Interviews = () => {
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetcher = useCallback(
    (token?: string) => apiClient.listInterviews({ page, pageSize }, token),
    [page, pageSize]
  );

  const { data: interviews, loading, error, meta } = useApiList<Interview>(fetcher, [page, pageSize]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading interviews...</div>
          <div className="text-sm text-muted-foreground">Fetching interview schedule and results.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading interviews</div>
          <div className="mb-4 text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  const total = meta?.total ?? interviews.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <main className="container mx-auto min-h-dvh px-4 py-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
              <p className="text-sm text-muted-foreground">
                Manage AI interview sessions synced from the backend.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {total} interviews • page {page}/{totalPages}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interviews.map((iv) => (
              <Card key={iv.id} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {iv.title} <span className="text-xs font-normal text-muted-foreground">({iv.id.slice(0, 6)})</span>
                  </CardTitle>
                  <CardDescription>{iv.application?.job?.title || iv.applicationId}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusColor[iv.status] || "default"}>{iv.status}</Badge>
                    <Badge variant="outline">{iv.type}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><span className="font-medium text-foreground">Access code:</span> {iv.accessCode}</div>
                    <div><span className="font-medium text-foreground">Expires:</span> {new Date(iv.expiresAt).toLocaleString()}</div>
                    {iv.sessionUrl && <div className="truncate"><span className="font-medium text-foreground">Session URL:</span> {iv.sessionUrl}</div>}
                  </div>
                  {iv.overallScore !== null && iv.overallScore !== undefined && (
                    <div className="font-medium text-foreground">Score: {iv.overallScore}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </main>
      </SignedIn>
    </>
  );
};

export default Interviews;
