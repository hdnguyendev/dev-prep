import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SmartSearchInput } from "@/components/SmartSearchInput";
import { COMPANY_FILTER_TEXT } from "@/constants/companies";
import illCompanies from "@/assets/illustration-companies.svg";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, type Company } from "@/lib/api";
import { useApiList } from "@/lib/hooks/useApiList";
import {
  Building2,
  MapPin,
  Globe,
  CheckCircle,
  Search,
  Star,
  ArrowRight,
  X,
  LayoutGrid,
  Table,
  Briefcase,
  Award,
  Sparkles,
  BarChart3,
  ExternalLink,
  Filter,
  Zap,
  Target,
  Users,
} from "lucide-react";

const Companies = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [minRating, setMinRating] = useState<string>("");
  const [industryFilters, setIndustryFilters] = useState<Set<string>>(new Set());
  const [countryFilters, setCountryFilters] = useState<Set<string>>(new Set());
  const [cityFilters, setCityFilters] = useState<Set<string>>(new Set());
  const [sizeFilters, setSizeFilters] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    const saved = localStorage.getItem("companies-view-mode");
    return (saved === "table" || saved === "grid") ? saved : "grid";
  });
  const pageSize = 12;
  const [sort, setSort] = useState<"recommended" | "rating" | "name">("recommended");

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const fetcher = useCallback(
    (token?: string) =>
      apiClient.listCompanies(
        {
          page,
          pageSize,
          q: searchQuery.trim() || undefined,
          // Server-side filter: only fetch verified companies when toggled
          isVerified: verifiedOnly || undefined,
        },
        token
      ),
    [page, pageSize, searchQuery, verifiedOnly]
  );

  const { data: companies, loading, error, meta } = useApiList<Company>(
    fetcher,
    [page, pageSize, searchQuery, verifiedOnly]
  );

  const getCompanyInitial = (company: Company) => {
    return company.name?.[0]?.toUpperCase() || "C";
  };

  const getCompanyColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-green-500 to-emerald-500",
      "from-yellow-500 to-orange-500",
      "from-indigo-500 to-purple-500",
      "from-rose-500 to-pink-500",
      "from-teal-500 to-cyan-500",
    ];
    return colors[index % colors.length];
  };

  // Client-side filtering only for filters (search is done on server)
  const filteredCompanies = companies.filter((c) => {
    // verifiedOnly đã filter trên server (isVerified=true), không cần filter lại trên client
    if (hasWebsiteOnly && !c.website) return false;

    const minRatingNum = Number(minRating);
    if (minRating && Number.isFinite(minRatingNum)) {
      const rating = c.averageRating ?? 0;
      if (rating < minRatingNum) return false;
    }

    if (industryFilters.size > 0) {
      const industry = c.industry ?? "";
      if (!industry || !industryFilters.has(industry)) return false;
    }
    if (countryFilters.size > 0) {
      const country = c.country ?? "";
      if (!country || !countryFilters.has(country)) return false;
    }
    if (cityFilters.size > 0) {
      const city = c.city ?? "";
      if (!city || !cityFilters.has(city)) return false;
    }
    if (sizeFilters.size > 0) {
      const size = c.companySize ?? "";
      if (!size || !sizeFilters.has(size)) return false;
    }

    return true;
  });

  const sortedCompanies = useMemo(() => {
    const list = [...filteredCompanies];
    if (sort === "name") return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (sort === "rating")
      return list.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    // recommended: verified + rating + reviews
    return list.sort((a, b) => {
      const aScore =
        (a.isVerified ? 100 : 0) +
        (a.averageRating ?? 0) * 10 +
        Math.min(50, a.totalReviews ?? 0);
      const bScore =
        (b.isVerified ? 100 : 0) +
        (b.averageRating ?? 0) * 10 +
        Math.min(50, b.totalReviews ?? 0);
      return bScore - aScore;
    });
  }, [filteredCompanies, sort]);

  const availableIndustries = Array.from(
    new Set(companies.map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));
  const availableCountries = Array.from(
    new Set(companies.map((c) => c.country).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));
  const availableCities = Array.from(
    new Set(companies.map((c) => c.city).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));
  const availableSizes = Array.from(
    new Set(companies.map((c) => c.companySize).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const toggleSetValue = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const clearFilters = () => {
    setVerifiedOnly(false);
    setHasWebsiteOnly(false);
    setMinRating("");
    setIndustryFilters(new Set());
    setCountryFilters(new Set());
    setCityFilters(new Set());
    setSizeFilters(new Set());
  };

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("companies-view-mode", mode);
  };

  const activeFilterCount =
    Number(verifiedOnly) +
    Number(hasWebsiteOnly) +
    Number(Boolean(minRating)) +
    industryFilters.size +
    countryFilters.size +
    cityFilters.size +
    sizeFilters.size;

  const stats = useMemo(() => {
    const total = meta?.total ?? companies.length;
    const verified = companies.filter((c) => c.isVerified).length;
    const countries = new Set(companies.map((c) => c.country).filter(Boolean)).size;
    const industries = new Set(companies.map((c) => c.industry).filter(Boolean)).size;
    return { total, verified, countries, industries };
  }, [companies, meta?.total]);

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-0">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="mb-2 text-lg font-semibold">Loading companies...</div>
          <div className="text-sm text-muted-foreground">Discovering top employers for you</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-0">
        <Card className="max-w-md border-red-200">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center text-red-600">Error loading companies</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil((meta?.total ?? companies.length) / pageSize));

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-br from-purple-500/5 via-background to-primary/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              {/* Left: Text Content */}
              <div className="text-center md:text-left">
                <Badge className="mb-4 gap-1.5 bg-gradient-to-r from-purple-500/10 to-primary/10 border-purple-500/20 text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3 w-3" />
                  {companies.length} Companies Available
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
                  Discover Top{" "}
                  <span className="bg-gradient-to-r from-purple-500 to-primary bg-clip-text text-transparent">
                    Companies
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Compare verified employers, ratings, and locations. Find your perfect workplace match.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Verified Companies
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Real Reviews
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Global Reach
                  </div>
                </div>
              </div>
              
              {/* Right: Illustration */}
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-primary/20 to-pink-500/20 blur-3xl rounded-3xl" />
                  <img 
                    src={illCompanies} 
                    alt="Companies illustration" 
                    className="relative w-full h-auto max-w-lg mx-auto"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <Card className="border-2 shadow-lg mb-6">
              <CardContent className="p-4">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                >
                  {/* Search Input */}
                  <div className="relative sm:col-span-1">
                    <SmartSearchInput
                      value={searchInput}
                      onChange={setSearchInput}
                      onKeyPress={handleKeyPress}
                      placeholder="Search companies by name, industry, location..."
                      className="h-11"
                      suggestionType="company"
                    />
                  </div>

                  {/* Search Button */}
                  <Button type="submit" className="h-11 px-4 sm:px-8 gap-2 sm:col-span-1 md:col-span-1">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                    <span className="sm:hidden">Go</span>
                  </Button>

                  {/* Filters - Desktop */}
                  <div className="hidden md:flex items-center gap-2 sm:col-span-2 md:col-span-1 md:col-start-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={verifiedOnly ? "default" : "outline"}
                      onClick={() => setVerifiedOnly((v) => !v)}
                      className="h-11"
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      {COMPANY_FILTER_TEXT.verifiedOnly}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={hasWebsiteOnly ? "default" : "outline"}
                      onClick={() => setHasWebsiteOnly((v) => !v)}
                      className="h-11"
                    >
                      <Globe className="mr-1 h-4 w-4" />
                      {COMPANY_FILTER_TEXT.hasWebsite}
                    </Button>

                    <div className="flex h-11 items-center gap-2 rounded-md border bg-background px-3">
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {COMPANY_FILTER_TEXT.minRating}
                      </div>
                      <Input
                        className="h-9 w-20 border-0 p-0 shadow-none focus-visible:ring-0"
                        inputMode="decimal"
                        placeholder="0-5"
                        value={minRating}
                        onChange={(e) => setMinRating(e.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsFilterOpen(true)}
                      className="h-11 gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      {COMPANY_FILTER_TEXT.filtersTitle}
                      {activeFilterCount > 0 && (
                        <Badge variant="outline" className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-primary/10 text-primary border-primary/20">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>

                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as "recommended" | "rating" | "name")}
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Top rated</option>
                      <option value="name">A → Z</option>
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearFilters}
                      className="h-11"
                      disabled={activeFilterCount === 0}
                    >
                      {COMPANY_FILTER_TEXT.clear}
                    </Button>
                  </div>

                  {/* Mobile Filters Row */}
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2 md:hidden">
                    <Button
                      type="button"
                      size="sm"
                      variant={verifiedOnly ? "default" : "outline"}
                      onClick={() => setVerifiedOnly((v) => !v)}
                      className="h-9 text-xs"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={hasWebsiteOnly ? "default" : "outline"}
                      onClick={() => setHasWebsiteOnly((v) => !v)}
                      className="h-9 text-xs"
                    >
                      <Globe className="mr-1 h-3 w-3" />
                      Website
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsFilterOpen(true)}
                      className="h-9 gap-1.5 text-xs"
                    >
                      <Filter className="h-3 w-3" />
                      More
                      {activeFilterCount > 0 && (
                        <Badge variant="outline" className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as "recommended" | "rating" | "name")}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs flex-1 min-w-[120px]"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Top rated</option>
                      <option value="name">A → Z</option>
                    </select>
                  </div>
                </form>
              </CardContent>
            </Card>

            {(searchQuery || activeFilterCount > 0 || sort !== "recommended") && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {searchQuery ? <Badge variant="outline">Search: {searchQuery}</Badge> : null}
                {verifiedOnly ? <Badge variant="outline">Verified</Badge> : null}
                {hasWebsiteOnly ? <Badge variant="outline">Has website</Badge> : null}
                {minRating ? <Badge variant="outline">Min rating: {minRating}</Badge> : null}
                {Array.from(industryFilters).map((v) => (
                  <Badge key={`ind-${v}`} variant="outline">
                    {v}
                  </Badge>
                ))}
                {Array.from(countryFilters).map((v) => (
                  <Badge key={`ct-${v}`} variant="outline">
                    {v}
                  </Badge>
                ))}
                {Array.from(cityFilters).map((v) => (
                  <Badge key={`city-${v}`} variant="outline">
                    {v}
                  </Badge>
                ))}
                {Array.from(sizeFilters).map((v) => (
                  <Badge key={`sz-${v}`} variant="outline">
                    {v}
                  </Badge>
                ))}
                {sort !== "recommended" ? <Badge variant="outline">Sort: {sort}</Badge> : null}
              </div>
            )}
          </div>

          {/* Advanced filters (modal) */}
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto gap-6 p-8">
              <DialogHeader>
                <DialogTitle>{COMPANY_FILTER_TEXT.filtersTitle}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                {availableIndustries.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{COMPANY_FILTER_TEXT.industry}</div>
                    <div className="flex flex-wrap gap-2">
                      {availableIndustries.map((v) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={industryFilters.has(v) ? "default" : "outline"}
                          onClick={() => setIndustryFilters((prev) => toggleSetValue(prev, v))}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {availableCountries.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{COMPANY_FILTER_TEXT.country}</div>
                    <div className="flex flex-wrap gap-2">
                      {availableCountries.map((v) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={countryFilters.has(v) ? "default" : "outline"}
                          onClick={() => setCountryFilters((prev) => toggleSetValue(prev, v))}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {availableCities.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{COMPANY_FILTER_TEXT.city}</div>
                    <div className="flex flex-wrap gap-2">
                      {availableCities.map((v) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={cityFilters.has(v) ? "default" : "outline"}
                          onClick={() => setCityFilters((prev) => toggleSetValue(prev, v))}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{COMPANY_FILTER_TEXT.companySize}</div>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((v) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={sizeFilters.has(v) ? "default" : "outline"}
                          onClick={() => setSizeFilters((prev) => toggleSetValue(prev, v))}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  {COMPANY_FILTER_TEXT.clear}
                </Button>
                <Button type="button" onClick={() => setIsFilterOpen(false)}>
                  {COMPANY_FILTER_TEXT.done}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="container mx-auto px-4 py-0 my-16">
        {/* Stats Bar */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="group relative overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 text-center relative">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 shadow-lg group-hover:scale-110 transition-transform">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {stats.total}
              </div>
              <div className="text-sm font-medium text-muted-foreground">Total Companies</div>
              <div className="mt-2 text-xs text-muted-foreground/70">Active employers</div>
            </CardContent>
          </Card>
          
          <Card className="group relative overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 text-center relative">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 shadow-lg group-hover:scale-110 transition-transform">
                <Award className="h-7 w-7" />
              </div>
              <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {stats.verified}
              </div>
              <div className="text-sm font-medium text-muted-foreground">Verified</div>
              <div className="mt-2 text-xs text-muted-foreground/70">Trusted employers</div>
            </CardContent>
          </Card>
          
          <Card className="group relative overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 text-center relative">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-7 w-7" />
              </div>
              <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {stats.countries}
              </div>
              <div className="text-sm font-medium text-muted-foreground">Countries</div>
              <div className="mt-2 text-xs text-muted-foreground/70">Global presence</div>
            </CardContent>
          </Card>
          
          <Card className="group relative overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 text-center relative">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-400 shadow-lg group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7" />
              </div>
              <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {stats.industries}
              </div>
              <div className="text-sm font-medium text-muted-foreground">Industries</div>
              <div className="mt-2 text-xs text-muted-foreground/70">Diverse sectors</div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{sortedCompanies.length}</span> companies found
              </span>
            </div>
            {sortedCompanies.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                {sortedCompanies.length} results
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">View:</span>
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("grid")}
                className="h-8 px-3 gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("table")}
                className="h-8 px-3 gap-1.5"
              >
                <Table className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Companies View */}
        {sortedCompanies.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/10 to-primary/10">
                <Building2 className="h-10 w-10 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No companies found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any companies matching your search criteria. Try adjusting your filters or search terms.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={() => { setSearchQuery(""); setSearchInput(""); }} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Search
                </Button>
                <Button variant="outline" onClick={clearFilters} className="gap-2" disabled={activeFilterCount === 0}>
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedCompanies.map((company, index) => (
                <Card
                  key={company.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer h-full flex flex-col"
                  onClick={() => navigate(`/companies/${company.slug}`)}
                >
                  {/* Cover Image / Gradient */}
                  <div className={`h-24 relative overflow-hidden ${
                    company.coverUrl 
                      ? '' 
                      : `bg-gradient-to-br ${getCompanyColor(index)}`
                  }`}>
                    {company.coverUrl ? (
                      <img
                        src={company.coverUrl}
                        alt={`${company.name} cover`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.className = `h-24 bg-gradient-to-br ${getCompanyColor(index)} relative overflow-hidden`;
                          }
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    
                    {/* Verified Badge */}
                    {company.isVerified && (
                      <Badge className="absolute top-2 right-2 gap-1 bg-white text-primary">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="relative -mt-8 pb-3">
                    {/* Company Logo */}
                    <div className="mb-3 flex justify-center">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="h-20 w-20 rounded-2xl border-4 border-background object-cover shadow-xl"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-20 w-20 rounded-2xl border-4 border-background bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-3xl font-bold text-white shadow-xl ${company.logoUrl ? "hidden" : ""}`}
                      >
                        {getCompanyInitial(company)}
                      </div>
                    </div>

                    <CardTitle className="text-center text-lg group-hover:text-primary transition-colors">
                      {company.name}
                    </CardTitle>
                    <CardDescription className="text-center text-xs">
                      {company.industry || "Technology"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm flex-1 flex flex-col">
                    {/* Industry Badge */}
                    <div className="flex items-center gap-2 min-h-[1.5rem]">
                      {company.industry ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Briefcase className="h-3 w-3" />
                          {company.industry}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs opacity-50">
                          <Briefcase className="h-3 w-3" />
                          Technology
                        </Badge>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-muted-foreground min-h-[1.5rem]">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <MapPin className="h-3 w-3" />
                      </div>
                      <span className="truncate">
                        {(company.city || company.country) 
                          ? [company.city, company.country].filter(Boolean).join(", ")
                          : "Location not specified"}
                      </span>
                    </div>

                    {/* Company Size */}
                    <div className="flex items-center gap-2 text-muted-foreground min-h-[1.5rem]">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        <Users className="h-3 w-3" />
                      </div>
                      <span>{company.companySize || "Size not specified"}</span>
                    </div>

                    {/* Website */}
                    <div className="flex items-center gap-2 text-muted-foreground min-h-[1.5rem]">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                        <Globe className="h-3 w-3" />
                      </div>
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary transition-colors flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {company.website.replace(/^https?:\/\/(www\.)?/, "")}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">No website</span>
                      )}
                    </div>

                    {/* Rating - Always show, push to bottom */}
                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const rating = company.averageRating ?? 0;
                          const rounded = Math.round(rating);
                          return (
                            <>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i <= rounded
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300 dark:text-gray-600"
                                  }`}
                                />
                              ))}
                              {company.totalReviews ? (
                                <span className="ml-2 text-xs font-medium text-foreground">
                                  {rating.toFixed(1)}
                                  <span className="text-muted-foreground ml-1">
                                    ({company.totalReviews} reviews)
                                  </span>
                                </span>
                              ) : (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {COMPANY_FILTER_TEXT.noRatings}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {company.isVerified && (
                        <Badge variant="outline" className="gap-1 text-xs border-green-500/30 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <div className="border-t p-4 bg-muted/30">
                    <Button
                      className="w-full gap-2 group-hover:gap-3 transition-all bg-gradient-to-r from-purple-500 to-primary hover:from-purple-600 hover:to-primary/90 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.slug}`);
                      }}
                    >
                      <Briefcase className="h-4 w-4" />
                      View Jobs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                      <tr>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Company
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            Industry
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            Location
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Size
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            Rating
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            Website
                          </div>
                        </th>
                        <th className="px-4 py-4 text-right text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCompanies.map((company, index) => (
                        <tr
                          key={company.id}
                          className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/companies/${company.slug}`)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {company.logoUrl ? (
                                <img
                                  src={company.logoUrl}
                                  alt={company.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-lg font-bold text-white ${company.logoUrl ? "hidden" : ""}`}
                              >
                                {getCompanyInitial(company)}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {company.name}
                                  {company.isVerified && (
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {company.industry || "N/A"}
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {[company.city, company.country].filter(Boolean).join(", ") || "N/A"}
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {company.companySize || "N/A"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              {(() => {
                                const rating = company.averageRating ?? 0;
                                const rounded = Math.round(rating);
                                return (
                                  <>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i <= rounded
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      {rating > 0 ? rating.toFixed(1) : "N/A"}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {company.website ? (
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {company.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 20)}
                                {company.website.replace(/^https?:\/\/(www\.)?/, "").length > 20 ? "..." : ""}
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/companies/${company.slug}`);
                                }}
                                className="gap-2"
                              >
                                <ArrowRight className="h-4 w-4" />
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && <span className="text-muted-foreground px-2">...</span>}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default Companies;
