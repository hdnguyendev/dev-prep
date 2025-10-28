import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient, type Job } from "@/lib/api";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [types, setTypes] = useState<Record<string, boolean>>({
    "Full-time": false,
    "Part-time": false,
    Contract: false,
    Internship: false,
    Remote: false,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Fetch jobs from API
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await apiClient.getJobs(token ?? undefined);
        if (response.success) {
          setJobs(response.data);
          if (response.data.length > 0) {
            setSelectedId(response.data[0].id);
          }
        } else {
          setError(response.message || "Failed to fetch jobs");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [getToken]);

  const allTags = useMemo(() => {
    const t = new Set<string>();
    jobs.forEach((j) => j.tags.forEach((x) => t.add(x)));
    return Array.from(t);
  }, [jobs]);

  const filtered = useMemo(() => {
    const activeTypes = Object.entries(types)
      .filter(([, v]) => v)
      .map(([k]) => k);
    let list = jobs.filter((j) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q));
      const matchesLocation = !location || j.location.toLowerCase().includes(location.toLowerCase());
      const matchesType = activeTypes.length === 0 || activeTypes.includes(j.type);
      const matchesTags = selectedTags.length === 0 || selectedTags.every((t) => j.tags.includes(t));
      return matchesQuery && matchesLocation && matchesType && matchesTags;
    });
    if (sort === "salary") list = list.sort((a, b) => a.salary.localeCompare(b.salary));
    return list;
  }, [jobs, location, query, selectedTags, sort, types]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selected = jobs.find((j) => j.id === selectedId) ?? null;

  const toggleType = (k: string) => setTypes((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading jobs...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch the latest job listings.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">Error loading jobs</div>
          <div className="mb-4 text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  return (
    <>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
    <SignedIn>
    <main className="container mx-auto grid min-h-dvh grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[280px_1fr_380px]">
      {/* Sidebar filters */}
      <aside className="rounded-lg border bg-card p-4">
        <div className="mb-4">
          <div className="mb-2 text-sm font-semibold">Search</div>
          <Input placeholder="Job title, company, tag..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mb-4">
          <div className="mb-2 text-sm font-semibold">Location</div>
          <Input placeholder="City or Remote" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <Separator className="my-4" />
        <div className="mb-4">
          <div className="mb-2 text-sm font-semibold">Type</div>
          <div className="space-y-2 text-sm">
            {Object.keys(types).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={types[k]} onChange={() => toggleType(k)} className="h-4 w-4" />
                {k}
              </label>
            ))}
          </div>
        </div>
        <Separator className="my-4" />
        <div>
          <div className="mb-2 text-sm font-semibold">Tags</div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => (
              <Badge
                key={t}
                variant={selectedTags.includes(t) ? "success" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </aside>

      {/* Job list */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {filtered.length} jobs • page {page}/{totalPages}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-md border bg-background px-2"
            >
              <option value="recent">Most recent</option>
              <option value="salary">Salary</option>
            </select>
          </div>
        </div>

        {paged.map((j) => (
          <Card key={j.id} className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedId === j.id ? "ring-2 ring-ring/50" : ""}`} onClick={() => setSelectedId(j.id)}>
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold">{j.company}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{j.location}</Badge>
                  <Badge variant="outline">{j.type}</Badge>
                </div>
              </div>
              <CardTitle className="text-base md:text-lg">{j.title}</CardTitle>
              <CardDescription>{j.salary}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="mt-3 flex flex-wrap gap-2">
                {j.tags.map((t) => (
                  <Badge key={t} variant="default">{t}</Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-muted-foreground">Ref • {j.id.padStart(4, "0")}</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Save</Button>
                <Button size="sm">Apply</Button>
              </div>
            </CardFooter>
          </Card>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      </section>

      {/* Details panel */}
      <aside className="hidden rounded-lg border bg-card p-4 md:block">
        {!selected ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Select a job to see details</div>
        ) : (
          <div className="flex h-full flex-col">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{selected.company}</div>
              <h2 className="text-xl font-semibold leading-tight">{selected.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{selected.location}</Badge>
                <Badge variant="outline">{selected.type}</Badge>
                <span className="text-muted-foreground">{selected.salary}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                {selected.tags.map((t) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between pt-6">
              <div className="text-xs text-muted-foreground">Ref {selected.id.padStart(4, "0")}</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Share</Button>
                <Button variant="ghost" size="sm">Save</Button>
                <Button size="sm">Apply</Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </main>
    </SignedIn>
    </>
  );
};

export default Jobs;