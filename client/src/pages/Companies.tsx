import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient, type Company } from "@/lib/api";
import { useApiList } from "@/lib/hooks/useApiList";
import {
  Building2,
  MapPin,
  Users,
  Globe,
  CheckCircle,
  Search,
  TrendingUp,
  Star,
  ArrowRight,
  Briefcase,
  X,
} from "lucide-react";

const Companies = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 12;

  const fetcher = useCallback(
    (token?: string) => apiClient.listCompanies({ page, pageSize }, token),
    [page, pageSize]
  );

  const { data: companies, loading, error, meta } = useApiList<Company>(fetcher, [page, pageSize]);

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

  const filteredCompanies = companies.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query) ||
      c.country?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
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
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
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

  const total = meta?.total ?? companies.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-br from-purple-500/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-8 text-center">
            <Badge className="mb-4">
              <Building2 className="mr-1 h-3 w-3" />
              {companies.length} Companies
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
              Explore Top <span className="bg-gradient-to-r from-purple-500 to-primary bg-clip-text text-transparent">Companies</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover the best employers and find your perfect fit
            </p>
          </div>

          {/* Search Bar */}
          <Card className="border-2 shadow-lg max-w-2xl mx-auto">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search companies by name, industry, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total Companies</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">
                {companies.filter((c) => c.isVerified).length}
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">2.4k+</div>
              <div className="text-xs text-muted-foreground">Open Positions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">98%</div>
              <div className="text-xs text-muted-foreground">Response Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Grid */}
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No companies found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search terms
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCompanies.map((company, index) => (
                <Card
                  key={company.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
                  onClick={() => navigate(`/companies/${company.slug}`)}
                >
                  {/* Cover Image / Gradient */}
                  <div className={`h-24 bg-gradient-to-br ${getCompanyColor(index)} relative`}>
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
                      <div
                        className={`h-20 w-20 rounded-2xl border-4 border-background bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-3xl font-bold text-white shadow-xl`}
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

                  <CardContent className="space-y-3 text-sm">
                    {/* Location */}
                    {(company.city || company.country) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {[company.city, company.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Company Size */}
                    {company.companySize && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>{company.companySize} employees</span>
                      </div>
                    )}

                    {/* Website */}
                    {company.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {company.website.replace(/^https?:\/\/(www\.)?/, "")}
                        </a>
                      </div>
                    )}

                    {/* Rating (placeholder) */}
                    <div className="flex items-center gap-1 pt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i <= 4
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">4.2/5</span>
                    </div>
                  </CardContent>

                  <div className="border-t p-4">
                    <Button
                      className="w-full gap-1 group-hover:gap-2 transition-all"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.slug}`);
                      }}
                    >
                      View Jobs
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
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
                  {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Companies;
