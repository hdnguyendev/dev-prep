import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { apiClient, type Company } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  Building2,
  ArrowRight,
  CheckCircle,
  Globe,
  Users,
  Trash2,
  ExternalLink,
} from "lucide-react";

const FollowedCompanies = ({ embedded }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [followedCompanies, setFollowedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowConfirmOpen, setUnfollowConfirmOpen] = useState(false);
  const [companyToUnfollow, setCompanyToUnfollow] = useState<string | null>(null);
  const [unfollowing, setUnfollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not signed in (skip when embedded - parent layout already handles auth)
  useEffect(() => {
    if (embedded) return;
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [embedded, isSignedIn, navigate]);

  // Fetch followed companies
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchFollowedCompanies = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await apiClient.getFollowedCompanies(
          { page: 1, pageSize: 100 },
          token ?? undefined
        );

        if (response.success) {
          setFollowedCompanies(response.data);
        } else {
          setError("Failed to load followed companies");
        }
      } catch (err) {
        console.error("Error fetching followed companies:", err);
        setError("Failed to load followed companies");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedCompanies();
  }, [isSignedIn, getToken]);

  // Handle unfollow
  const handleUnfollowClick = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    setCompanyToUnfollow(companyId);
    setUnfollowConfirmOpen(true);
  };

  const handleUnfollowConfirm = async () => {
    if (!companyToUnfollow) return;
    
    try {
      setUnfollowing(true);
      const token = await getToken();
      await apiClient.unfollowCompany(companyToUnfollow, token ?? undefined);
      setFollowedCompanies(prevCompanies => prevCompanies.filter(company => company.id !== companyToUnfollow));
      setUnfollowConfirmOpen(false);
      setCompanyToUnfollow(null);
    } catch (err) {
      console.error("Error unfollowing company:", err);
      alert("Failed to unfollow company. Please try again.");
    } finally {
      setUnfollowing(false);
    }
  };

  // Helper functions
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
    ];
    return colors[index % colors.length];
  };

  if (!isSignedIn && !embedded) {
    return null;
  }

  const content = (
    <>
      {/* Header */}
      {!embedded && (
      <section className="border-b bg-gradient-to-br from-purple-500/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-4">
            <Building2 className="h-4 w-4 fill-blue-500 text-blue-500" />
            <span className="text-sm font-medium">Your Followed Companies</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            Companies You're Following
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Keep track of companies you're interested in and stay updated with their latest opportunities
          </p>
        </div>
      </section>
      )}

      <div className={embedded ? "" : "container mx-auto px-4 py-8"}>
        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-3">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="max-w-md mx-auto border-red-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-red-600 text-center mb-4">{error}</div>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && followedCompanies.length === 0 && (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Followed Companies Yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                Start following companies that interest you to keep track of them
              </p>
              <Button onClick={() => navigate("/companies")}>
                Browse Companies
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        {!loading && !error && followedCompanies.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {followedCompanies.length} Followed Compan{followedCompanies.length !== 1 ? "ies" : "y"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on any company to view details and available jobs
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {followedCompanies.map((company, index) => (
                <Card
                  key={company.id}
                  className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer"
                  onClick={() => navigate(`/companies/${company.slug}`)}
                >
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {company.isVerified && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleUnfollowClick(e, company.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                      </Button>
                    </div>

                    {/* Company Logo & Info */}
                    <div className="flex items-center gap-3 mb-3">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-lg"
                        />
                      ) : (
                        <div
                          className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-xl font-bold text-white shadow-lg`}
                        >
                          {getCompanyInitial(company)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">
                          {company.name}
                        </div>
                        {company.industry && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {company.industry}
                          </div>
                        )}
                      </div>
                    </div>

                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {company.name}
                    </CardTitle>

                    <CardDescription className="flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />
                      {company.city && company.country 
                        ? `${company.city}, ${company.country}`
                        : company.city || company.country || "Location not specified"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    {company.companySize && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{company.companySize}</span>
                      </div>
                    )}

                    {company.averageRating && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          ⭐ {company.averageRating.toFixed(1)}
                          {company.totalReviews && ` (${company.totalReviews} reviews)`}
                        </Badge>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="relative justify-between border-t bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (company.website) {
                          window.open(company.website, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 group-hover:gap-2 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.slug}`);
                      }}
                    >
                      View Jobs
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 transition-colors rounded-lg pointer-events-none" />
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 fill-blue-500 text-blue-500" />
            <CardTitle className="text-lg">Followed companies</CardTitle>
          </div>
          <CardDescription>Companies you're following</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-purple-500/5 to-background">
      {content}

      {/* Confirmation Dialog for Unfollow */}
      <ConfirmationDialog
        open={unfollowConfirmOpen}
        onOpenChange={setUnfollowConfirmOpen}
        onConfirm={handleUnfollowConfirm}
        title="Unfollow Company?"
        description="Are you sure you want to unfollow this company? You'll stop receiving updates about them."
        confirmText="Unfollow"
        cancelText="Cancel"
        variant="default"
        loading={unfollowing}
      />
    </main>
  );
};

export default FollowedCompanies;

