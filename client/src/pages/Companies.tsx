import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, type Company } from "@/lib/api";
import { useApiList } from "@/lib/hooks/useApiList";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

const Companies = () => {
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const fetcher = useCallback(
    (token?: string) => apiClient.listCompanies({ page, pageSize }, token),
    [page, pageSize]
  );

  const { data: companies, loading, error, meta } = useApiList<Company>(fetcher, [page, pageSize]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading companies...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch company data.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading companies</div>
          <div className="mb-4 text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  const total = meta?.total ?? companies.length;
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
              <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
              <p className="text-sm text-muted-foreground">
                Browse hiring organizations synced from the backend.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {total} companies • page {page}/{totalPages}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Card key={c.id} className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                  <CardDescription>{c.industry || "Industry not set"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    {c.city && <Badge variant="outline">{c.city}</Badge>}
                    {c.country && <Badge variant="outline">{c.country}</Badge>}
                    {c.companySize && <Badge variant="default">Size: {c.companySize}</Badge>}
                    {c.isVerified && <Badge variant="success">Verified</Badge>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><span className="font-medium text-foreground">Slug:</span> {c.slug}</div>
                    <div><span className="font-medium text-foreground">Website:</span> {c.website || "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(c.createdAt).toLocaleDateString()}
                  </div>
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

export default Companies;
