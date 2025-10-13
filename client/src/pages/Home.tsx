import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import beaver from "@/assets/beaver.svg";
import Navbar from "@/components/Navbar";

const Home = () => {
  const navigate = useNavigate();
  const slides = useMemo(
    () => [
      {
        title: "Design delightful UIs",
        subtitle: "Craft pixel-perfect interfaces with speed.",
        color: "from-primary/15 to-transparent",
      },
      {
        title: "Ship faster",
        subtitle: "Turn ideas into offers in record time.",
        color: "from-emerald-400/20 to-transparent",
      },
      {
        title: "Level up your career",
        subtitle: "Opportunities matched to your skills.",
        color: "from-indigo-400/20 to-transparent",
      },
    ],
    []
  );
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Scroll-reveal for sections
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-show");
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Animated counters
  const countersRef = useRef<Array<HTMLSpanElement | null>>([]);
  useEffect(() => {
    const targets = [2400, 1200, 35000, 4.9];
    const durationMs = 1200;
    const startTs = performance.now();

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTs) / durationMs);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      targets.forEach((target, i) => {
        const el = countersRef.current[i];
        if (!el) return;
        const val = i === 3 ? (ease * target).toFixed(1) : Math.round(ease * target).toLocaleString();
        el.textContent = i === 0 ? `${val}+` : i === 1 ? `${val}+` : i === 2 ? `${val}` : `${val}/5`;
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-dvh">
      <section className="container mx-auto px-4 py-16 md:py-24 reveal">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Job Portal
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Find your next role. Build your career.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Search openings from top companies, track applications, and land your next opportunity with a modern, focused workflow.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate("/applications")}>
                Explore Applications
              </Button>
              <Button variant="outline">
                Post a Job
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Fast</span>
                • Easy • Free
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            {/* floating gradient orbs */}
            <div className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl animate-float" />
            <div className="pointer-events-none absolute -right-10 -bottom-10 size-32 rounded-full bg-gradient-to-tr from-indigo-400/25 to-transparent blur-2xl animate-float-delayed" />
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/30 to-transparent blur-xl" />
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-center p-8">
                <img src={beaver} alt="Dev Prep" className="h-40 w-40" />
              </div>
              <div className="grid grid-cols-3 gap-2 border-t p-3 text-center text-xs text-muted-foreground">
                <div className="rounded-md bg-muted px-2 py-1">Save</div>
                <div className="rounded-md bg-muted px-2 py-1">Track</div>
                <div className="rounded-md bg-muted px-2 py-1">Apply</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 reveal">
        {/* Search bar using Input + Button */}
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Search roles (e.g., Frontend, Product)" />
          <Input placeholder="Location (Remote, HCMC, Hanoi)" />
          <Button>Search</Button>
        </div>
        <div className="mb-8 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Popular:</span>
          {["Frontend", "Backend", "Design", "PM", "AI/ML"].map((t) => (
            <Badge key={t} className="cursor-pointer hover:opacity-80">{t}</Badge>
          ))}
        </div>
        <Separator className="my-6" />
        {/* Features using Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="transition-transform duration-300 hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Curated Listings</CardTitle>
              <CardDescription>Vetted roles across startups and enterprises.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Save your favorites, compare offers, and apply in one place.
            </CardContent>
          </Card>
          <Card className="transition-transform duration-300 hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Application Tracker</CardTitle>
              <CardDescription>Stay on top from outreach to offer.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Notes, statuses, and reminders that keep momentum.
            </CardContent>
          </Card>
          <Card className="transition-transform duration-300 hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Modern UI</CardTitle>
              <CardDescription>Accessible, fast, and delightful.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Powered by shadcn UI and Tailwind design tokens.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Carousel */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <div className="relative h-60 md:h-72">
            {slides.map((s, i) => (
              <div
                key={i}
                className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
              >
                <div className={`relative mx-auto w-full max-w-2xl rounded-lg px-8 py-10 text-center`}>
                  <div className={`pointer-events-none absolute -inset-6 -z-10 rounded-2xl bg-gradient-to-br ${s.color} blur-xl`} />
                  <h3 className="mb-2 text-2xl font-semibold tracking-tight md:text-3xl">{s.title}</h3>
                  <p className="text-sm text-muted-foreground md:text-base">{s.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 w-6 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between p-3 md:p-4">
            <div className="pointer-events-auto">
              <Button variant="ghost" size="sm" onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}>
                ‹
              </Button>
            </div>
            <div className="pointer-events-auto">
              <Button variant="ghost" size="sm" onClick={() => setCurrent((c) => (c + 1) % slides.length)}>
                ›
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Logos marquee */}
      <section className="container mx-auto px-4 py-14 reveal group">
        <p className="mb-5 text-center text-sm text-muted-foreground">Trusted by teams at</p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
          <div className="flex gap-10 whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused]" style={{ animation: "ticker 30s linear infinite" }}>
            {[
              "Acme",
              "Globex",
              "Initech",
              "Soylent",
              "Umbrella",
              "Hooli",
              "Stark",
              "Wayne",
            ]
              .concat([
                "Acme",
                "Globex",
                "Initech",
                "Soylent",
                "Umbrella",
                "Hooli",
                "Stark",
                "Wayne",
              ])
              .map((name, i) => (
                <div key={i} className="inline-flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-md border bg-card text-xs font-semibold">
                    {name[0]}
                  </div>
                  <span className="text-sm text-muted-foreground">{name}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t bg-secondary/30 reveal">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 text-center md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-3xl font-bold"><span ref={(el) => { countersRef.current[0] = el; }}>0</span></div>
            <div className="text-xs text-muted-foreground">Open roles</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold"><span ref={(el) => { countersRef.current[1] = el; }}>0</span></div>
            <div className="text-xs text-muted-foreground">Hiring teams</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold"><span ref={(el) => { countersRef.current[2] = el; }}>0</span></div>
            <div className="text-xs text-muted-foreground">Candidates</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold"><span ref={(el) => { countersRef.current[3] = el; }}>0</span></div>
            <div className="text-xs text-muted-foreground">User rating</div>
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="container mx-auto px-4 py-16 reveal">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured jobs</h2>
            <p className="text-sm text-muted-foreground">Handpicked roles to get you started.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/applications")}>View all</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map((i) => (
            <Card key={i} className="transition-all hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold">Acme Corp</span>
                  <Badge variant="outline">Remote</Badge>
                </div>
                <CardTitle>Senior Frontend Engineer</CardTitle>
                <CardDescription>React, TypeScript, Design Systems</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Build performant web apps and contribute to our component library.
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-xs text-muted-foreground">$160k–$185k • Equity</div>
                <Button size="sm" onClick={() => navigate("/applications")}>Apply</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="container mx-auto px-4 pb-20 reveal">
        <div className="rounded-xl border bg-card p-6 md:p-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <blockquote className="max-w-2xl text-balance text-base text-muted-foreground">
              “Got an offer in two weeks. The tracker made it effortless to keep momentum and follow up.”
            </blockquote>
            <div className="text-sm">
              <div className="font-semibold">Linh N.</div>
              <div className="text-muted-foreground">Product Designer @ Nova</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-10 md:flex-row">
          <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} Dev Prep</div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button className="hover:text-foreground">Privacy</button>
            <button className="hover:text-foreground">Terms</button>
            <button className="hover:text-foreground">Contact</button>
          </div>
  </div>
      </footer>
      </main>
    </>
  );
};

export default Home;