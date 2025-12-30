import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { Loader2, User, Crown, Sparkles, Mail } from "lucide-react";

interface MatchingCandidate {
  candidateId?: string;
  candidateUserId?: string; // User ID for messaging
  candidateName?: string | null;
  candidateHeadline?: string | null;
  candidateAvatar?: string | null;
  candidateEmail?: string | null;
  candidateNotificationEmail?: string | null;
  candidatePhone?: string | null;
  candidateSkills?: string[];
  candidateExperience?: string;
  candidateLocation?: string | null;
  matchScore: number;
  breakdown?: {
    skillScore: number;
    experienceScore: number;
    titleScore: number;
    locationScore: number;
    bonusScore: number;
  };
  details?: {
    matchedSkills: string[];
    missingSkills: string[];
  };
}

const RecruiterMatchingCandidates = () => {
  const { jobId: paramJobId } = useParams();
  const jobId = paramJobId || "";
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  const [candidates, setCandidates] = useState<MatchingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVIP, setIsVIP] = useState(false);

  // Debug isVIP state changes
  useEffect(() => {
  }, [isVIP]);
  const [teaserData, setTeaserData] = useState<{
    matchCount: number,
    hasMatches: boolean,
    breakdown?: {
      highMatches: number,
      mediumMatches: number,
      lowMatches: number
    }
  } | null>(null);

  useEffect(() => {
    // Only run when userId is available
    if (!userId) {
      setLoading(false);
      return;
    }

    // Ensure jobId is properly initialized before making API call
    if (!jobId || jobId === "") {
      setLoading(false);
      return;
    }

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching matching candidates for job:", jobId);
        const response = await apiClient.getMatchingCandidates(jobId, 20, userId);
        console.log("API Response:", response);

        if (response.success) {
          console.log("Response data:", response.data);
          // Sort candidates by match score descending for better experience
          const candidatesArray = Array.isArray(response.data) ? response.data : [];
          console.log("Candidates array:", candidatesArray);
          const sortedCandidates = candidatesArray.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
          console.log("Sorted candidates:", sortedCandidates);
          setCandidates(sortedCandidates);
          setIsVIP(response.isVIP || false);
          setTeaserData(response.teaserData || null);
        } else {
          if (response.requiresVIP) {
            // Legacy: Complete blocking for FREE users (if server still returns 403)
            setError("This feature is only available for VIP recruiters. Upgrade to VIP to view ranked candidate matches.");
            setIsVIP(false);
            setTeaserData(response.teaserData || null);
          } else {
            setError(response.message || "Failed to fetch matching candidates");
          }
        }
      } catch (error) {
        console.error("Error fetching matching candidates:", error);
        setError("Failed to fetch matching candidates");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [userId]);


  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    if (score >= 40) return "outline";
    return "destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show teaser for FREE recruiters

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mb-2 animate-pulse"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>

          {/* Candidates Skeleton - Desktop Table */}
          <div className="hidden md:block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="animate-pulse">
                {/* Table Header */}
                <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-4">
                  <div className="grid grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    ))}
                  </div>
                </div>
                {/* Table Rows */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-gray-600 p-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                      </div>
                      {/* Match Score */}
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                      {/* Skills */}
                      <div className="flex gap-1">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                      {/* Location & Experience */}
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                      {/* Contact */}
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Card Skeleton */}
          <div className="md:hidden space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-0">

        <div className="space-y-8">
        {isVIP && candidates.length === 0 ? (
          <div className="text-center py-16">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <p className="text-lg text-muted-foreground mb-2">No matching candidates found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your job requirements or check back later
            </p>
          </div>
        ) : isVIP && candidates.length > 0 ? (
          // VIP users with candidates - show detailed list
          <div className="space-y-8">
            {/* Matching Candidates Grid */}
              <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span>Matching Candidates</span>
                    <Badge variant="secondary" className="ml-2">
                      {candidates.length}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Top candidates ranked by match score
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {candidates.filter(c => c.matchScore >= 80).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Excellent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {candidates.filter(c => c.matchScore >= 60 && c.matchScore < 80).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Good</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {candidates.filter(c => c.matchScore < 60).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Potential</div>
                  </div>
                </div>
              </div>

              {/* Candidates Table - Desktop */}
              <div className="hidden md:block">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/4">
                            Candidate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-16">
                            Score
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">
                            Skills
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-32">
                            Info
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/4">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {candidates.map((candidate, index) => (
                          <tr key={candidate.candidateId || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {/* Candidate Info */}
                          <td className="px-3 py-2">
                            <div className="flex items-center">
                              <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex items-center justify-center ring-1 ring-white shadow-sm">
                                  {candidate.candidateAvatar ? (
                                    <img
                                      src={candidate.candidateAvatar}
                                      alt={candidate.candidateName || "Candidate"}
                                      className="w-8 h-8 rounded-md object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 border border-white rounded-full"></div>
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {candidate.candidateName || "Anonymous Candidate"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-24">
                                  {candidate.candidateHeadline || "No headline"}
                                </div>
                              </div>
                            </div>
                          </td>

                            {/* Match Score */}
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                  candidate.matchScore >= 80
                                    ? 'bg-green-100 text-green-800'
                                    : candidate.matchScore >= 60
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {candidate.matchScore}%
                                </div>
                              </div>
                            </td>

                          {/* Skills */}
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-0.5">
                              {candidate.candidateSkills && candidate.candidateSkills.length > 0 ? (
                                <>
                                  {candidate.candidateSkills.slice(0, 1).map((skill, skillIndex) => (
                                    <span
                                      key={skillIndex}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {candidate.candidateSkills.length > 1 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      +{candidate.candidateSkills.length - 1}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>

                          {/* Info */}
                          <td className="px-3 py-2">
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                              {candidate.candidateLocation && (
                                <div className="truncate max-w-20" title={candidate.candidateLocation}>
                                  📍 {candidate.candidateLocation}
                                </div>
                              )}
                              {candidate.candidateExperience && (
                                <div>
                                  💼 {candidate.candidateExperience}y
                                </div>
                              )}
                              {(!candidate.candidateLocation && !candidate.candidateExperience) && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-3 py-2">
                            {(candidate.candidateNotificationEmail || candidate.candidateEmail) ? (
                              <div className="flex items-center">
                                <Mail className="w-3 h-3 text-blue-500 mr-1" />
                                <a
                                  href={`mailto:${candidate.candidateNotificationEmail || candidate.candidateEmail}?subject=Job Opportunity&body=Hi ${candidate.candidateName},%0A%0AI found your profile and think you'd be a great fit for our position.%0A%0ABest regards,%0ARecruiter`}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium truncate max-w-24"
                                  title={candidate.candidateNotificationEmail || candidate.candidateEmail}
                                >
                                  {candidate.candidateNotificationEmail || candidate.candidateEmail}
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2 text-sm font-medium">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/candidates/${candidate.candidateId}`)}
                                className="text-xs h-7 px-2"
                              >
                                <User className="w-3 h-3" />
                              </Button>
                              {(candidate.candidateNotificationEmail || candidate.candidateEmail) && (
                                <Button
                                  size="sm"
                                  onClick={() => window.open(`mailto:${candidate.candidateNotificationEmail || candidate.candidateEmail}?subject=Job Opportunity&body=Hi ${candidate.candidateName},%0A%0AI found your profile and think you'd be a great fit for our position.%0A%0ABest regards,%0ARecruiter`)}
                                  className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700"
                                >
                                  <Mail className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Empty State */}
                  {candidates.length === 0 && (
                    <div className="text-center py-16">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">No matching candidates found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your job requirements or check back later
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {candidates.map((candidate, index) => (
                  <Card key={candidate.candidateId || index} className="relative overflow-hidden">
                    {/* Match Score Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        candidate.matchScore >= 80
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : candidate.matchScore >= 60
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {candidate.matchScore}% Match
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Candidate Header */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center ring-1 ring-white shadow-sm">
                            {candidate.candidateAvatar ? (
                              <img
                                src={candidate.candidateAvatar}
                                alt={candidate.candidateName || "Candidate"}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border border-white rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm truncate">
                            {candidate.candidateName || "Anonymous Candidate"}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {candidate.candidateHeadline || "No headline provided"}
                          </p>
                        </div>
                      </div>

                      {/* Quick Info */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {candidate.candidateLocation && <span>📍 {candidate.candidateLocation}</span>}
                          {candidate.candidateExperience && <span>💼 {candidate.candidateExperience}y</span>}
                        </div>

                        {candidate.candidateSkills && candidate.candidateSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {candidate.candidateSkills.slice(0, 2).map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="outline" className="text-xs px-1.5 py-0.5">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => navigate(`/candidates/${candidate.candidateId}`)}
                        >
                          <User className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {(candidate.candidateNotificationEmail || candidate.candidateEmail) && (
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => window.open(`mailto:${candidate.candidateNotificationEmail || candidate.candidateEmail}?subject=Job Opportunity&body=Hi ${candidate.candidateName},%0A%0AI found your profile and think you'd be a great fit for our position.%0A%0ABest regards,%0ARecruiter`)}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        ) : !isVIP ? (
          // FREE users with teaser data - show dashboard summary directly
          <div className="space-y-4">
            {/* VIP Actions */}
            {isVIP && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="default"
                  onClick={() => {
                    // Open contact modal or show detailed list
                    alert('Detailed candidate list is available for VIP recruiters. Contact feature coming soon!');
                  }}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contact Candidates
                </Button>
              </div>
            )}

            {/* FREE User Upgrade Prompt - Enhanced */}
            {!isVIP && teaserData?.totalMatches && teaserData.totalMatches > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:border-orange-800/50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>

                {/* Floating crown icon */}
                <div className="absolute -top-2 -right-2 animate-bounce">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-3 shadow-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="relative z-10">
                  {/* Main headline */}
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                      🚀 Unlock VIP Superpowers!
                    </h3>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Transform your hiring with premium candidate insights
                    </p>
                  </div>

                  {/* Statistics highlight */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600">{teaserData.breakdown?.highMatches || 0}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">High Matches</div>
                    </div>
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Candidates</div>
                    </div>
                  </div>

                  {/* Benefits list */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">View detailed candidate profiles</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Direct contact with top candidates</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Advanced filtering & sorting</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">AI-powered hiring insights</span>
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg p-3 text-center">
                      <div className="text-sm font-medium">🎯 Limited Time: Upgrade & Save 20%</div>
                      <div className="text-xs opacity-90">First 50 recruiters get premium support</div>
                    </div>

                    <Button
                      onClick={() => navigate("/recruiter/membership")}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 gap-2"
                    >
                      <Crown className="h-5 w-5" />
                      Upgrade to VIP Now
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">⚡ Instant Access</span>
                    </Button>
                  </div>

                  {/* Social proof */}
                <div className="text-center mt-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ⭐⭐⭐⭐⭐ "VIP saved me 3 weeks of hiring time!" - TechLead Corp
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
};

export default RecruiterMatchingCandidates;

