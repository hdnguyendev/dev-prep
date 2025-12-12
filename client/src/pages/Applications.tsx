import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, type Application } from "@/lib/api";
import { useApiList } from "@/lib/hooks/useApiList";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

const statusVariants: Record<Application["status"], "default" | "outline" | "success"> = {
  APPLIED: "outline",
  REVIEWING: "outline",
  SHORTLISTED: "success",
  INTERVIEW_SCHEDULED: "default",
  INTERVIEWED: "default",
  OFFER_SENT: "success",
  HIRED: "success",
  REJECTED: "outline",
  WITHDRAWN: "outline",
};

const Applications = () => {
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetcher = useCallback(
    (token?: string) => apiClient.listApplications({ page, pageSize }, token),
    [page, pageSize]
  );

  const { data: applications, loading, error, meta } = useApiList<Application>(fetcher, [page, pageSize]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading applications...</div>
          <div className="text-sm text-muted-foreground">Fetching your applications from the backend.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading applications</div>
          <div className="mb-4 text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  const total = meta?.total ?? applications.length;
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
              <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
              <p className="text-sm text-muted-foreground">
                Track application status with live data from the API.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {total} applications • page {page}/{totalPages}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <Card key={app.id} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {app.job?.title || "Job"}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({app.id.slice(0, 6)})</span>
                  </CardTitle>
                  <CardDescription>
                    {app.job?.company?.name || app.job?.slug || "Company not set"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariants[app.status] || "default"}>{app.status}</Badge>
                    <span>Applied at {new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><span className="font-medium text-foreground">Candidate:</span> {app.candidateId}</div>
                    <div><span className="font-medium text-foreground">Resume:</span> {app.resumeUrl || "—"}</div>
                  </div>
                  {app.coverLetter && (
                    <div>
                      <div className="mb-1 font-medium text-foreground">Cover Letter</div>
                      <p className="line-clamp-3 whitespace-pre-line">{app.coverLetter}</p>
                    </div>
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

export default Applications;
