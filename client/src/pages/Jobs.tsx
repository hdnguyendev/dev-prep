import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SmartSearchInput } from "@/components/SmartSearchInput";
import { apiClient, type Job, type JobType } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Heart,
  Search,
  Filter,
  ArrowRight,
  X,
  CheckCircle,
  LayoutGrid,
  Table,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const Jobs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [minSalary, setMinSalary] = useState<number>(0);
  const [maxSalary, setMaxSalary] = useState<number>(25); // Max 25k USD/month
  const [includeNegotiable, setIncludeNegotiable] = useState(true); // Include negotiable salaries by default
  const [types, setTypes] = useState<Record<JobType, boolean>>({
    FULL_TIME: false,
    PART_TIME: false,
    CONTRACT: false,
    FREELANCE: false,
    INTERNSHIP: false,
    REMOTE: false,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);
  const [postedDate, setPostedDate] = useState<string>(""); // "24h", "week", "month", "3months"
  const [companySize, setCompanySize] = useState<string>("");
  const [minCompanyRating, setMinCompanyRating] = useState<number>(0);
  const [companyVerified, setCompanyVerified] = useState<boolean | null>(null); // null = all, true = verified only, false = unverified only
  const [workLocation, setWorkLocation] = useState<string>(""); // "remote", "onsite", "hybrid", ""
  const [currency, setCurrency] = useState<string>(""); // "USD", "VND", "EUR", "JPY", ""
  const [deadlineFilter, setDeadlineFilter] = useState<string>(""); // "week", "month", "3months", ""
  const [hasBenefits, setHasBenefits] = useState<boolean | null>(null);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    const saved = localStorage.getItem("jobs-view-mode");
    return (saved === "table" || saved === "grid") ? saved : "grid";
  });
  const pageSize = 20;
  const fetchPageSize = 500; // Increased to fetch more jobs from database

  useEffect(() => {
    const q = (searchParams.get("query") || "").trim();
    const loc = (searchParams.get("location") || "").trim();
    const category = searchParams.get("category");
    
    if (q) {
      setQuery(q);
      setQueryInput(q);
    }
    if (loc) setLocation(loc);
    if (category) {
      // Set selectedTags to filter by category
      setSelectedTags([category]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setQuery(queryInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Fetch jobs with search from server
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    let requestId = 0;
    
    const fetchJobs = async () => {
      const currentRequestId = ++requestId;
      
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const response = await apiClient.listJobs({ 
          page: 1, 
          pageSize: fetchPageSize,
          q: query.trim() || undefined,
        }, token ?? undefined);
        
        // Only update state if this is still the latest request and component is mounted
        if (currentRequestId !== requestId || !isMounted || abortController.signal.aborted) {
          return;
        }
        
        if (response.success) {
          console.log("📥 Fetched jobs:", response.data.length);
          // Log first job to check structure
          if (response.data.length > 0) {
            const firstJob = response.data[0];
            console.log("📋 First job structure:", {
              id: firstJob.id,
              title: firstJob.title,
              experienceLevel: firstJob.experienceLevel,
              publishedAt: firstJob.publishedAt,
              createdAt: firstJob.createdAt,
              categories: firstJob.categories,
              skills: firstJob.skills,
              hasCategories: !!firstJob.categories && firstJob.categories.length > 0,
              hasSkills: !!firstJob.skills && firstJob.skills.length > 0,
            });
          }
          setJobs(response.data);
        } else {
          setError(response.message || "Failed to fetch jobs");
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        if (currentRequestId === requestId && isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchJobs();
    
    return () => {
      isMounted = false;
      requestId++; // Invalidate any pending requests
      abortController.abort();
    };
  }, [getToken, query]);

  useEffect(() => {
    setPage(1);
  }, [query, location, selectedTags, sort, types]);

  // Fetch saved jobs status
  useEffect(() => {
    if (!isSignedIn || jobs.length === 0) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchSavedStatus = async () => {
      try {
        const token = await getToken();
        const savedJobsResponse = await apiClient.getSavedJobs({ page: 1, pageSize: 100 }, token ?? undefined);
        
        // Only update state if component is still mounted and request wasn't aborted
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        
        if (savedJobsResponse.success) {
          const savedJobIds = new Set(savedJobsResponse.data.map(job => job.id));
          setSavedJobs(savedJobIds);
        }
      } catch (err: any) {
        console.error(err);
        if (!isMounted || abortController.signal.aborted) {
          return;
        }
        if (err instanceof Error && err.name !== 'AbortError') {
          setError("An error occurred");
        }
      }
    };

    fetchSavedStatus();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isSignedIn, jobs, getToken]);

  // Toggle save job
  const handleToggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    
    if (!isSignedIn) {
      alert("Please sign in to save jobs");
      return;
    }

    try {
      const token = await getToken();
      const isSaved = savedJobs.has(jobId);

      if (isSaved) {
        await apiClient.unsaveJob(jobId, token ?? undefined);
        setSavedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      } else {
        await apiClient.saveJob(jobId, token ?? undefined);
        setSavedJobs(prev => new Set(prev).add(jobId));
      }
    } catch {
      alert("Failed to save job. Please try again.");
    }
  };

  const getLocation = (job: Job) =>
    job.isRemote ? "Remote" : job.location || "Not specified";

  const typeLabels: Record<JobType, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    FREELANCE: "Freelance",
    INTERNSHIP: "Internship",
    REMOTE: "Remote",
  };

  const getEmploymentTypeLabel = (job: Job) => typeLabels[job.type] ?? job.type;

  const getSalaryRange = (job: Job) => {
    if (job.isSalaryNegotiable) return "Negotiable";
    if (job.salaryMin && job.salaryMax) {
      return `$${(job.salaryMin / 1000).toFixed(0)}k-${(job.salaryMax / 1000).toFixed(0)}k`;
    }
    if (job.salaryMin) return `From $${(job.salaryMin / 1000).toFixed(0)}k`;
    if (job.salaryMax) return `Up to $${(job.salaryMax / 1000).toFixed(0)}k`;
    return "Not specified";
  };

  const getSkillTags = (job: Job): string[] =>
    (job.skills || [])
      .map((s) => s.skill?.name)
      .filter((x): x is string => Boolean(x))
      .slice(0, 3);

  const getCategoryTags = (job: Job): string[] =>
    (job.categories || [])
      .map((c) => c.category?.name)
      .filter((x): x is string => Boolean(x));

  const allTags = useMemo(() => {
    const t = new Set<string>();
    jobs.forEach((j) => {
      (j.skills || []).forEach((s) => {
        if (s.skill?.name) t.add(s.skill.name);
      });
      (j.categories || []).forEach((c) => {
        if (c.category?.name) t.add(c.category.name);
      });
    });
    return Array.from(t).slice(0, 20);
  }, [jobs]);

  const allCategories = useMemo(() => {
    const c = new Set<string>();
    jobs.forEach((j) => {
      (j.categories || []).forEach((cat) => {
        if (cat.category?.name) c.add(cat.category.name);
      });
    });
    return Array.from(c).slice(0, 20);
  }, [jobs]);

  const allSkills = useMemo(() => {
    const s = new Set<string>();
    jobs.forEach((j) => {
      (j.skills || []).forEach((skill) => {
        if (skill.skill?.name) s.add(skill.skill.name);
      });
    });
    return Array.from(s).slice(0, 30);
  }, [jobs]);

  const allExperienceLevels = useMemo(() => {
    const levels = new Set<string>();
    jobs.forEach((j) => {
      if (j.experienceLevel) {
        const level = j.experienceLevel.trim();
        const levelLower = level.toLowerCase();
        // Check exact match first
        if (levelLower === "junior" || levelLower === "entry" || levelLower.includes("intern")) {
          levels.add("Junior");
        } else if (levelLower === "mid" || levelLower === "middle" || levelLower.includes("mid")) {
          levels.add("Mid");
        } else if (levelLower === "senior" || levelLower.includes("senior")) {
          levels.add("Senior");
        } else if (levelLower === "lead" || levelLower.includes("lead") || levelLower.includes("principal") || levelLower.includes("architect")) {
          levels.add("Lead");
        } else {
          // If doesn't match any known pattern, add the original value (capitalized)
          levels.add(level.charAt(0).toUpperCase() + level.slice(1).toLowerCase());
        }
      }
    });
    return Array.from(levels).sort();
  }, [jobs]);

  const allCompanySizes = useMemo(() => {
    const sizes = new Set<string>();
    jobs.forEach((j) => {
      if (j.company?.companySize) {
        sizes.add(j.company.companySize);
      }
    });
    return Array.from(sizes).sort();
  }, [jobs]);

  const postedAgo = (createdAt: string) => {
    const ts = createdAt ? new Date(createdAt).getTime() : 0;
    if (!ts) return "";
    const diffMs = Date.now() - ts;
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    if (days <= 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  // Client-side filtering with all filters
  const filtered = useMemo(() => {
    console.log("🔍 Filtering jobs with:", {
      experienceLevels,
      postedDate,
      selectedCategories,
      selectedSkills,
      jobsCount: jobs.length,
    });
    
    const activeTypes = Object.entries(types)
      .filter(([, v]) => v)
      .map(([k]) => k);
    let list = jobs.filter((j) => {
      // Exclude DRAFT and CLOSED jobs
      if (j.status === "DRAFT" || j.status === "CLOSED") {
        return false;
      }
      
      // Location filter
      const matchesLocation =
        !location || getLocation(j).toLowerCase().includes(location.toLowerCase());
      
      // Job type filter
      const matchesType =
        activeTypes.length === 0 || activeTypes.includes(j.type);
      
      // Work location filter (Remote/Onsite/Hybrid)
      const matchesWorkLocation = (() => {
        if (!workLocation) return true;
        if (workLocation === "remote") return j.isRemote === true;
        if (workLocation === "onsite") return j.isRemote === false && j.location && !j.location.toLowerCase().includes("remote");
        if (workLocation === "hybrid") {
          // Hybrid jobs: has location but also allows remote, or location mentions hybrid
          return (j.location && (j.location.toLowerCase().includes("hybrid") || (j.isRemote && j.location))) || 
                 (j.isRemote && j.location);
        }
        return true;
      })();
      
      // Experience level filter
      const matchesExperience = (() => {
        if (experienceLevels.length === 0) return true;
        if (!j.experienceLevel) {
          console.log("❌ Job has no experienceLevel:", j.title);
          return false;
        }
        const jobLevel = j.experienceLevel.trim();
        const jobLevelLower = jobLevel.toLowerCase();
        const matched = experienceLevels.some(level => {
          const levelTrimmed = level.trim();
          const levelLower = levelTrimmed.toLowerCase();
          // Exact match (case-insensitive)
          if (jobLevelLower === levelLower) return true;
          // For "Junior": match Junior, Entry, Intern
          if (levelLower === "junior") {
            return jobLevelLower === "junior" || jobLevelLower === "entry" || jobLevelLower.includes("intern");
          }
          // For "Mid": match Mid, Middle
          if (levelLower === "mid") {
            return jobLevelLower === "mid" || jobLevelLower === "middle" || jobLevelLower.includes("mid");
          }
          // For "Senior": match Senior
          if (levelLower === "senior") {
            return jobLevelLower === "senior" || jobLevelLower.includes("senior");
          }
          // For "Lead": match Lead, Principal, Architect
          if (levelLower === "lead") {
            return jobLevelLower === "lead" || jobLevelLower.includes("lead") || jobLevelLower.includes("principal") || jobLevelLower.includes("architect");
          }
          // Fallback: contains check
          return jobLevelLower.includes(levelLower) || levelLower.includes(jobLevelLower);
        });
        if (!matched) {
          console.log(`❌ Experience mismatch: job="${jobLevel}" vs filter=[${experienceLevels.join(", ")}]`);
        }
        return matched;
      })();
      
      // Posted date filter
      const matchesPostedDate = (() => {
        if (!postedDate) return true;
        // Use publishedAt if available, otherwise use createdAt
        const dateToCheck = j.publishedAt || j.createdAt;
        if (!dateToCheck) {
          // If no date, exclude if filter is set
          return false;
        }
        try {
          const published = new Date(dateToCheck).getTime();
          if (isNaN(published)) return false;
          const now = Date.now();
          const diffMs = now - published;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          switch (postedDate) {
            case "24h": return diffDays <= 1;
            case "week": return diffDays <= 7;
            case "month": return diffDays <= 30;
            case "3months": return diffDays <= 90;
            default: return true;
          }
        } catch {
          return false;
        }
      })();
      
      // Deadline filter
      const matchesDeadline = (() => {
        if (!deadlineFilter || !j.deadline) return true;
        try {
          const deadline = new Date(j.deadline).getTime();
          if (isNaN(deadline)) return true;
          const now = Date.now();
          const diffMs = deadline - now;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          switch (deadlineFilter) {
            case "week": return diffDays >= 0 && diffDays <= 7;
            case "month": return diffDays >= 0 && diffDays <= 30;
            case "3months": return diffDays >= 0 && diffDays <= 90;
            default: return true;
          }
        } catch {
          return true;
        }
      })();
      
      // Currency filter
      const matchesCurrency = !currency || j.currency === currency;
      
      // Company verified filter
      const matchesCompanyVerified = companyVerified === null || j.company?.isVerified === companyVerified;
      
      // Company size filter
      const matchesCompanySize = (() => {
        if (!companySize || !j.company?.companySize) return true;
        const jobSize = j.company.companySize.toLowerCase().trim();
        const filterSize = companySize.toLowerCase().trim();
        // Exact match or contains
        return jobSize === filterSize || jobSize.includes(filterSize) || filterSize.includes(jobSize);
      })();
      
      // Company rating filter
      const matchesCompanyRating = (() => {
        if (minCompanyRating === 0) return true;
        const rating = j.company?.averageRating;
        // If no rating, exclude if min rating is set
        if (rating === undefined || rating === null) return false;
        return rating >= minCompanyRating;
      })();
      
      // Benefits filter
      const matchesBenefits = (() => {
        if (hasBenefits === null) return true;
        const hasJobBenefits = j.benefits && j.benefits.trim() !== "";
        if (hasBenefits === false) return !hasJobBenefits;
        return hasJobBenefits;
      })();
      
      // Categories filter
      const matchesCategories = (() => {
        if (selectedCategories.length === 0) return true;
        const jobCategories = getCategoryTags(j);
        console.log(`📁 Job "${j.title}" categories:`, jobCategories, "vs filter:", selectedCategories);
        if (jobCategories.length === 0) {
          console.log(`❌ Job has no categories:`, j.title);
          return false;
        }
        // At least one selected category must match (case-insensitive)
        const matched = selectedCategories.some(cat => {
          const catLower = cat.toLowerCase().trim();
          return jobCategories.some(jobCat => jobCat.toLowerCase().trim() === catLower);
        });
        if (!matched) {
          console.log(`❌ Category mismatch: job=[${jobCategories.join(", ")}] vs filter=[${selectedCategories.join(", ")}]`);
        }
        return matched;
      })();
      
      // Skills filter
      const matchesSkills = (() => {
        if (selectedSkills.length === 0) return true;
        const jobSkills = (j.skills || []).map((s) => s.skill?.name).filter((x): x is string => Boolean(x));
        console.log(`🛠️ Job "${j.title}" skills:`, jobSkills, "vs filter:", selectedSkills);
        if (jobSkills.length === 0) {
          console.log(`❌ Job has no skills:`, j.title);
          return false;
        }
        // At least one selected skill must match (case-insensitive)
        const matched = selectedSkills.some(skill => {
          const skillLower = skill.toLowerCase().trim();
          return jobSkills.some(jobSkill => jobSkill.toLowerCase().trim() === skillLower);
        });
        if (!matched) {
          console.log(`❌ Skill mismatch: job=[${jobSkills.join(", ")}] vs filter=[${selectedSkills.join(", ")}]`);
        }
        return matched;
      })();
      
      // Legacy selectedTags filter (for backward compatibility)
      if (selectedTags.length > 0) {
        const jobCategories = getCategoryTags(j);
        const jobSkills = (j.skills || []).map((s) => s.skill?.name).filter((x): x is string => Boolean(x));
        const matchesTags = selectedTags.every((tag) => 
          jobCategories.includes(tag) || jobSkills.includes(tag)
        );
        if (!matchesTags) return false;
      }
      
      // Salary filter
      const matchesSalary = (() => {
        if (minSalary === 0 && maxSalary === 25 && includeNegotiable) return true;
        if (j.isSalaryNegotiable && includeNegotiable && minSalary === 0) return true;
        if (j.isSalaryNegotiable && !includeNegotiable) return false;
        if (!j.salaryMin && !j.salaryMax) return includeNegotiable;
        const jobMin = j.salaryMin || 0;
        const jobMax = j.salaryMax || jobMin;
        const filterMin = minSalary * 1000;
        const filterMax = maxSalary * 1000;
        return jobMin <= filterMax && jobMax >= filterMin;
      })();
      
      const allMatch = matchesLocation && matchesType && matchesWorkLocation && matchesExperience &&
             matchesPostedDate && matchesDeadline && matchesCurrency && matchesCompanyVerified &&
             matchesCompanySize && matchesCompanyRating && matchesBenefits && matchesCategories &&
             matchesSkills && matchesSalary;
      
      if (!allMatch && (experienceLevels.length > 0 || postedDate || selectedCategories.length > 0 || selectedSkills.length > 0)) {
        console.log(`❌ Job "${j.title}" filtered out:`, {
          matchesLocation,
          matchesType,
          matchesWorkLocation,
          matchesExperience,
          matchesPostedDate,
          matchesDeadline,
          matchesCurrency,
          matchesCompanyVerified,
          matchesCompanySize,
          matchesCompanyRating,
          matchesBenefits,
          matchesCategories,
          matchesSkills,
          matchesSalary,
        });
      }
      
      return allMatch;
    });
    
    console.log(`✅ Filtered ${list.length} jobs from ${jobs.length} total`);
    if (sort === "salary")
      list = list.sort((a, b) => (b.salaryMin || 0) - (a.salaryMin || 0));
    if (sort === "recent")
      list = list.sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
    return list;
  }, [jobs, location, selectedTags, selectedSkills, selectedCategories, experienceLevels, postedDate, companySize, minCompanyRating, companyVerified, workLocation, currency, deadlineFilter, hasBenefits, sort, types, minSalary, maxSalary, includeNegotiable]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleType = (k: JobType) => setTypes((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleSkill = (skill: string) => {
    console.log("🛠️ Toggling skill:", skill);
    setSelectedSkills((prev) => {
      const newSkills = prev.includes(skill) ? prev.filter((x) => x !== skill) : [...prev, skill];
      console.log("🛠️ New selected skills:", newSkills);
      return newSkills;
    });
  };
  const toggleCategory = (cat: string) => {
    console.log("📁 Toggling category:", cat);
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat];
      console.log("📁 New selected categories:", newCategories);
      return newCategories;
    });
  };
  const toggleExperienceLevel = (level: string) => {
    console.log("👤 Toggling experience level:", level);
    setExperienceLevels((prev) => {
      const newLevels = prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level];
      console.log("👤 New selected experience levels:", newLevels);
      return newLevels;
    });
  };

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("jobs-view-mode", mode);
  };

  const getCompanyInitial = (job: Job) => {
    return job.company?.name?.[0]?.toUpperCase() || "C";
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

  // Strip HTML tags from description
  const stripHtmlTags = (html: string | null | undefined): string => {
    if (!html) return "No description available";
    return html.replace(/<[^>]*>/g, "").trim() || "No description available";
  };

  const clearAll = () => {
    setQuery("");
    setLocation("");
    setSelectedTags([]);
    setTypes({
      FULL_TIME: false,
      PART_TIME: false,
      CONTRACT: false,
      FREELANCE: false,
      INTERNSHIP: false,
      REMOTE: false,
    });
    setSort("recent");
    setSearchParams({});
  };

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div className="mb-2 text-lg font-semibold">Loading amazing jobs...</div>
          <div className="text-sm text-muted-foreground">Finding the perfect opportunities for you</div>
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
            <CardTitle className="text-center text-red-600">Error loading jobs</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Hero Search Section */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Badge className="mb-4">
                <Briefcase className="mr-1 h-3 w-3" />
                {filtered.length} Jobs Available
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
                Find Your{" "}
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  Dream Job
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Search smarter, apply faster, and track your progress.
              </p>
            </div>

            {/* Search Bar */}
            <Card className="border-2 shadow-lg mb-6">
              <CardContent className="p-4">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_200px_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                    const params = new URLSearchParams();
                    if (queryInput.trim()) params.set("query", queryInput.trim());
                    if (location.trim()) params.set("location", location.trim());
                    setSearchParams(params);
                  }}
                >
                  <div className="relative sm:col-span-1">
                    <SmartSearchInput
                      value={queryInput}
                      onChange={setQueryInput}
                      onKeyPress={handleKeyPress}
                      placeholder="Job title, company, keywords..."
                      className="h-11"
                    />
                  </div>
                  <div className="relative sm:col-span-1 md:col-span-1">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                  <Button className="h-11 px-4 sm:px-8 gap-2 sm:col-span-2 md:col-span-1" type="submit">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                    <span className="sm:hidden">Go</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Popular Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {allTags.slice(0, 6).map((t) => (
                <Badge
                  key={t}
                  variant={selectedTags.includes(t) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </div>
                  {(selectedCategories.length > 0 || selectedSkills.length > 0 || experienceLevels.length > 0 || postedDate || companySize || minCompanyRating > 0 || companyVerified !== null || workLocation || currency || deadlineFilter || hasBenefits !== null || minSalary > 0 || maxSalary < 25 || !includeNegotiable || Object.values(types).some(Boolean)) && (
                    <Badge variant="secondary" className="text-xs">
                      {[
                        Object.values(types).filter(Boolean).length,
                        selectedCategories.length,
                        selectedSkills.length,
                        experienceLevels.length,
                        postedDate ? 1 : 0,
                        workLocation ? 1 : 0,
                        currency ? 1 : 0,
                        deadlineFilter ? 1 : 0,
                        companySize ? 1 : 0,
                        minCompanyRating > 0 ? 1 : 0,
                        companyVerified !== null ? 1 : 0,
                        hasBenefits !== null ? 1 : 0,
                        (minSalary > 0 || maxSalary < 25 || !includeNegotiable) ? 1 : 0,
                      ].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Employment Type */}
                <div>
                  <div className="mb-3 text-sm font-semibold">Employment Type</div>
                  <div className="space-y-2">
                    {(Object.keys(types) as JobType[]).map((k) => (
                      <label key={k} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={types[k]}
                          onChange={() => toggleType(k)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {typeLabels[k] ?? k}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Salary Range */}
                <div>
                  <div className="mb-3 text-sm font-semibold">Salary Range (USD)</div>
                  <div className="space-y-4">
                    {/* Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>${minSalary}k</span>
                        <span>${maxSalary}k</span>
                      </div>
                      <div className="relative h-2">
                        <div className="absolute h-2 w-full rounded-full bg-muted" />
                        <div
                          className="absolute h-2 rounded-full bg-primary"
                          style={{
                            left: `${(minSalary / 25) * 100}%`,
                            width: `${((maxSalary - minSalary) / 25) * 100}%`,
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="0.5"
                          value={minSalary}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val <= maxSalary) setMinSalary(val);
                          }}
                          className="absolute top-0 h-2 w-full appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-lg"
                        />
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="0.5"
                          value={maxSalary}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= minSalary) setMaxSalary(val);
                          }}
                          className="absolute top-0 h-2 w-full appearance-none bg-transparent cursor-pointer z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-lg"
                        />
                      </div>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Min (k)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={minSalary === 0 ? "" : minSalary}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 25 && val <= maxSalary) {
                              setMinSalary(val);
                            }
                          }}
                          className="h-9 text-sm"
                          min="0"
                          max="25"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Max (k)</label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={maxSalary === 25 ? "" : maxSalary}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 25 : Number(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 25 && val >= minSalary) {
                              setMaxSalary(val);
                            }
                          }}
                          className="h-9 text-sm"
                          min="0"
                          max="25"
                          step="0.5"
                        />
                      </div>
                    </div>

                    {/* Preset Ranges */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "$1-3k", min: 1, max: 3 },
                        { label: "$3-5k", min: 3, max: 5 },
                        { label: "$5-8k", min: 5, max: 8 },
                        { label: "$8k+", min: 8, max: 25 },
                      ].map((preset) => (
                        <Button
                          key={preset.label}
                          variant={minSalary === preset.min && maxSalary === preset.max ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setMinSalary(preset.min);
                            setMaxSalary(preset.max);
                          }}
                          className="h-8 text-xs"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* Include Negotiable Checkbox */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id="include-negotiable"
                        checked={includeNegotiable}
                        onChange={(e) => setIncludeNegotiable(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="include-negotiable" className="text-sm text-muted-foreground cursor-pointer">
                        Include negotiable salaries
                      </label>
                    </div>

                    {/* Clear Button */}
                    {(minSalary > 0 || maxSalary < 25 || !includeNegotiable) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMinSalary(0);
                          setMaxSalary(25);
                          setIncludeNegotiable(true);
                          setIncludeNegotiable(true);
                        }}
                        className="w-full text-xs"
                      >
                        Reset Salary Filter
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Work Location */}
                <div>
                  <div className="mb-3 text-sm font-semibold">Work Location</div>
                  <div className="space-y-2">
                    {[
                      { value: "remote", label: "Remote" },
                      { value: "onsite", label: "On-site" },
                      { value: "hybrid", label: "Hybrid" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="workLocation"
                          value={option.value}
                          checked={workLocation === option.value}
                          onChange={(e) => setWorkLocation(e.target.checked ? option.value : "")}
                          className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {option.label}
                        </span>
                      </label>
                    ))}
                    {workLocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWorkLocation("")}
                        className="w-full text-xs mt-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Categories & Skills - Collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors py-2">
                    <span>Categories & Skills</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    {/* Categories */}
                    {allCategories.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-muted-foreground">Categories</div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {allCategories.map((cat) => (
                            <Badge
                              key={`cat-${cat}`}
                              variant={selectedCategories.includes(cat) ? "default" : "outline"}
                              className="cursor-pointer hover:border-primary transition-colors text-xs"
                              onClick={() => toggleCategory(cat)}
                            >
                              {selectedCategories.includes(cat) && <CheckCircle className="mr-1 h-3 w-3" />}
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {allSkills.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-muted-foreground">Skills</div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {allSkills.map((skill) => (
                            <Badge
                              key={`skill-${skill}`}
                              variant={selectedSkills.includes(skill) ? "default" : "outline"}
                              className="cursor-pointer hover:border-primary transition-colors text-xs"
                              onClick={() => toggleSkill(skill)}
                            >
                              {selectedSkills.includes(skill) && <CheckCircle className="mr-1 h-3 w-3" />}
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Experience Level & Posted Date - Collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors py-2">
                    <span>Experience & Date</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    {/* Experience Level */}
                    {allExperienceLevels.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-muted-foreground">Experience Level</div>
                        <div className="space-y-1.5">
                          {allExperienceLevels.map((level) => (
                            <label key={level} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={experienceLevels.includes(level)}
                                onChange={() => toggleExperienceLevel(level)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-xs group-hover:text-primary transition-colors">
                                {level}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Posted Date */}
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Posted Date</div>
                      <div className="space-y-1.5">
                        {[
                          { value: "24h", label: "Last 24 hours" },
                          { value: "week", label: "Last week" },
                          { value: "month", label: "Last month" },
                          { value: "3months", label: "Last 3 months" },
                        ].map((option) => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="postedDate"
                              value={option.value}
                              checked={postedDate === option.value}
                              onChange={(e) => setPostedDate(e.target.checked ? option.value : "")}
                              className="h-3.5 w-3.5 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-xs group-hover:text-primary transition-colors">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Advanced Filters - Collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors py-2">
                    <span>Advanced Filters</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {/* Company Filters */}
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Company</div>
                      <div className="space-y-3">
                        {/* Company Verified */}
                        <div>
                          <div className="mb-1.5 text-xs text-muted-foreground">Verified Status</div>
                          <div className="space-y-1.5">
                            {[
                              { value: null, label: "All companies" },
                              { value: true, label: "Verified only" },
                              { value: false, label: "Unverified only" },
                            ].map((option) => (
                              <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name="companyVerified"
                                  checked={companyVerified === option.value}
                                  onChange={() => setCompanyVerified(option.value)}
                                  className="h-3.5 w-3.5 rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-xs group-hover:text-primary transition-colors">
                                  {option.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Company Size */}
                        {allCompanySizes.length > 0 && (
                          <div>
                            <div className="mb-1.5 text-xs text-muted-foreground">Company Size</div>
                            <select
                              value={companySize}
                              onChange={(e) => setCompanySize(e.target.value)}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                            >
                              <option value="">All sizes</option>
                              {allCompanySizes.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Company Rating */}
                        <div>
                          <div className="mb-1.5 text-xs text-muted-foreground">Min Rating</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="5"
                              step="0.5"
                              value={minCompanyRating}
                              onChange={(e) => setMinCompanyRating(Number(e.target.value))}
                              className="flex-1 h-1.5"
                            />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {minCompanyRating > 0 ? `${minCompanyRating.toFixed(1)}+` : "Any"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Currency */}
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Currency</div>
                      <div className="space-y-1.5">
                        {[
                          { value: "", label: "All currencies" },
                          { value: "USD", label: "USD" },
                          { value: "VND", label: "VND" },
                          { value: "EUR", label: "EUR" },
                          { value: "JPY", label: "JPY" },
                        ].map((option) => (
                          <label key={option.value || "all"} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="currency"
                              value={option.value}
                              checked={currency === option.value}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="h-3.5 w-3.5 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-xs group-hover:text-primary transition-colors">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Deadline */}
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Application Deadline</div>
                      <div className="space-y-1.5">
                        {[
                          { value: "", label: "Any deadline" },
                          { value: "week", label: "Within 1 week" },
                          { value: "month", label: "Within 1 month" },
                          { value: "3months", label: "Within 3 months" },
                        ].map((option) => (
                          <label key={option.value || "any"} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="deadlineFilter"
                              value={option.value}
                              checked={deadlineFilter === option.value}
                              onChange={(e) => setDeadlineFilter(e.target.value)}
                              className="h-3.5 w-3.5 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-xs group-hover:text-primary transition-colors">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Benefits</div>
                      <div className="space-y-1.5">
                        {[
                          { value: null, label: "All jobs" },
                          { value: true, label: "With benefits" },
                          { value: false, label: "Without benefits" },
                        ].map((option) => (
                          <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="hasBenefits"
                              checked={hasBenefits === option.value}
                              onChange={() => setHasBenefits(option.value)}
                              className="h-3.5 w-3.5 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-xs group-hover:text-primary transition-colors">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Clear Filters */}
                {(Object.values(types).some((v) => v) || selectedTags.length > 0 || selectedSkills.length > 0 || selectedCategories.length > 0 || experienceLevels.length > 0 || postedDate || companySize || minCompanyRating > 0 || companyVerified !== null || workLocation || currency || deadlineFilter || hasBenefits !== null || minSalary > 0 || maxSalary < 25 || !includeNegotiable) && (
                  <>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTypes({
                          FULL_TIME: false,
                          PART_TIME: false,
                          CONTRACT: false,
                          FREELANCE: false,
                          INTERNSHIP: false,
                          REMOTE: false,
                        });
                        setSelectedTags([]);
                        setSelectedSkills([]);
                        setSelectedCategories([]);
                        setExperienceLevels([]);
                        setPostedDate("");
                        setCompanySize("");
                        setMinCompanyRating(0);
                        setCompanyVerified(null);
                        setWorkLocation("");
                        setCurrency("");
                        setDeadlineFilter("");
                        setHasBenefits(null);
                        setMinSalary(0);
                        setMaxSalary(25);
                        setIncludeNegotiable(true);
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Jobs Grid */}
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> jobs found
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("grid")}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("table")}
                    className="h-8 px-3"
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                </div>
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      {/* Employment Type */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Employment Type</div>
                        <div className="space-y-2">
                          {(Object.keys(types) as JobType[]).map((k) => (
                            <label key={k} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={types[k]}
                                onChange={() => toggleType(k)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {typeLabels[k] ?? k}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Salary Range */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Salary Range (USD)</div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>${minSalary}k</span>
                              <span>${maxSalary}k</span>
                            </div>
                            <div className="relative h-2">
                              <div className="absolute h-2 w-full rounded-full bg-muted" />
                              <div
                                className="absolute h-2 rounded-full bg-primary"
                                style={{
                                  left: `${(minSalary / 25) * 100}%`,
                                  width: `${((maxSalary - minSalary) / 25) * 100}%`,
                                }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="25"
                                step="0.5"
                                value={minSalary}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val <= maxSalary) setMinSalary(val);
                                }}
                                className="absolute top-0 h-2 w-full appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-lg"
                              />
                              <input
                                type="range"
                                min="0"
                                max="25"
                                step="0.5"
                                value={maxSalary}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val >= minSalary) setMaxSalary(val);
                                }}
                                className="absolute top-0 h-2 w-full appearance-none bg-transparent cursor-pointer z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-lg"
                              />
                            </div>
                          </div>

                          {/* Input Fields */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Min (k)</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={minSalary === 0 ? "" : minSalary}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 25 && val <= maxSalary) {
                                    setMinSalary(val);
                                  }
                                }}
                                className="h-9 text-sm"
                                min="0"
                                max="25"
                                step="0.5"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Max (k)</label>
                              <Input
                                type="number"
                                placeholder="25"
                                value={maxSalary === 25 ? "" : maxSalary}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 25 : Number(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 25 && val >= minSalary) {
                                    setMaxSalary(val);
                                  }
                                }}
                                className="h-9 text-sm"
                                min="0"
                                max="25"
                                step="0.5"
                              />
                            </div>
                          </div>

                          {/* Include Negotiable Checkbox */}
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <input
                              type="checkbox"
                              id="include-negotiable-mobile"
                              checked={includeNegotiable}
                              onChange={(e) => setIncludeNegotiable(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="include-negotiable-mobile" className="text-sm text-muted-foreground cursor-pointer">
                              Include negotiable salaries
                            </label>
                          </div>

                          {/* Clear Button */}
                          {(minSalary > 0 || maxSalary < 25 || !includeNegotiable) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMinSalary(0);
                                setMaxSalary(25);
                                setIncludeNegotiable(true);
                              }}
                              className="w-full text-xs"
                            >
                              Reset Salary Filter
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Work Location */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Work Location</div>
                        <div className="space-y-2">
                          {[
                            { value: "remote", label: "Remote" },
                            { value: "onsite", label: "On-site" },
                            { value: "hybrid", label: "Hybrid" },
                          ].map((option) => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="workLocationMobile"
                                value={option.value}
                                checked={workLocation === option.value}
                                onChange={(e) => setWorkLocation(e.target.checked ? option.value : "")}
                                className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {option.label}
                              </span>
                            </label>
                          ))}
                          {workLocation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWorkLocation("")}
                              className="w-full text-xs mt-2"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Experience Level */}
                      {allExperienceLevels.length > 0 && (
                        <>
                          <div>
                            <div className="mb-3 text-sm font-semibold">Experience Level</div>
                            <div className="space-y-2">
                              {allExperienceLevels.map((level) => (
                                <label key={level} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={experienceLevels.includes(level)}
                                    onChange={() => toggleExperienceLevel(level)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm group-hover:text-primary transition-colors">
                                    {level}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Posted Date */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Posted Date</div>
                        <div className="space-y-2">
                          {[
                            { value: "24h", label: "Last 24 hours" },
                            { value: "week", label: "Last week" },
                            { value: "month", label: "Last month" },
                            { value: "3months", label: "Last 3 months" },
                          ].map((option) => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="postedDateMobile"
                                value={option.value}
                                checked={postedDate === option.value}
                                onChange={(e) => setPostedDate(e.target.checked ? option.value : "")}
                                className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {option.label}
                              </span>
                            </label>
                          ))}
                          {postedDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPostedDate("")}
                              className="w-full text-xs mt-2"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Categories */}
                      {allCategories.length > 0 && (
                        <>
                          <div>
                            <div className="mb-3 text-sm font-semibold">Categories</div>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                              {allCategories.map((cat) => (
                                <Badge
                                  key={`cat-${cat}`}
                                  variant={selectedCategories.includes(cat) ? "default" : "outline"}
                                  className="cursor-pointer hover:border-primary transition-colors"
                                  onClick={() => toggleCategory(cat)}
                                >
                                  {selectedCategories.includes(cat) && <CheckCircle className="mr-1 h-3 w-3" />}
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Skills */}
                      {allSkills.length > 0 && (
                        <>
                          <div>
                            <div className="mb-3 text-sm font-semibold">Skills</div>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                              {allSkills.map((skill) => (
                                <Badge
                                  key={`skill-${skill}`}
                                  variant={selectedSkills.includes(skill) ? "default" : "outline"}
                                  className="cursor-pointer hover:border-primary transition-colors"
                                  onClick={() => toggleSkill(skill)}
                                >
                                  {selectedSkills.includes(skill) && <CheckCircle className="mr-1 h-3 w-3" />}
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Company Filters */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Company</div>
                        <div className="space-y-4">
                          {/* Company Verified */}
                          <div>
                            <div className="mb-2 text-xs text-muted-foreground">Verified Status</div>
                            <div className="space-y-2">
                              {[
                                { value: null, label: "All companies" },
                                { value: true, label: "Verified only" },
                                { value: false, label: "Unverified only" },
                              ].map((option) => (
                                <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    name="companyVerifiedMobile"
                                    checked={companyVerified === option.value}
                                    onChange={() => setCompanyVerified(option.value)}
                                    className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm group-hover:text-primary transition-colors">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Company Size */}
                          {allCompanySizes.length > 0 && (
                            <div>
                              <div className="mb-2 text-xs text-muted-foreground">Company Size</div>
                              <select
                                value={companySize}
                                onChange={(e) => setCompanySize(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                              >
                                <option value="">All sizes</option>
                                {allCompanySizes.map((size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Company Rating */}
                          <div>
                            <div className="mb-2 text-xs text-muted-foreground">Min Rating</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={minCompanyRating}
                                  onChange={(e) => setMinCompanyRating(Number(e.target.value))}
                                  className="flex-1 h-2"
                                />
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                  {minCompanyRating > 0 ? `${minCompanyRating.toFixed(1)}+` : "Any"}
                                </span>
                              </div>
                              {minCompanyRating > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMinCompanyRating(0)}
                                  className="w-full text-xs"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Currency */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Currency</div>
                        <div className="space-y-2">
                          {[
                            { value: "", label: "All currencies" },
                            { value: "USD", label: "USD" },
                            { value: "VND", label: "VND" },
                            { value: "EUR", label: "EUR" },
                            { value: "JPY", label: "JPY" },
                          ].map((option) => (
                            <label key={option.value || "all"} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="currencyMobile"
                                value={option.value}
                                checked={currency === option.value}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Deadline */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Application Deadline</div>
                        <div className="space-y-2">
                          {[
                            { value: "", label: "Any deadline" },
                            { value: "week", label: "Within 1 week" },
                            { value: "month", label: "Within 1 month" },
                            { value: "3months", label: "Within 3 months" },
                          ].map((option) => (
                            <label key={option.value || "any"} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="deadlineFilterMobile"
                                value={option.value}
                                checked={deadlineFilter === option.value}
                                onChange={(e) => setDeadlineFilter(e.target.value)}
                                className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Benefits */}
                      <div>
                        <div className="mb-3 text-sm font-semibold">Benefits</div>
                        <div className="space-y-2">
                          {[
                            { value: null, label: "All jobs" },
                            { value: true, label: "With benefits" },
                            { value: false, label: "Without benefits" },
                          ].map((option) => (
                            <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="hasBenefitsMobile"
                                checked={hasBenefits === option.value}
                                onChange={() => setHasBenefits(option.value)}
                                className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Clear Filters */}
                      {(Object.values(types).some((v) => v) || selectedTags.length > 0 || selectedSkills.length > 0 || selectedCategories.length > 0 || experienceLevels.length > 0 || postedDate || companySize || minCompanyRating > 0 || companyVerified !== null || workLocation || currency || deadlineFilter || hasBenefits !== null || minSalary > 0 || maxSalary < 25 || !includeNegotiable) && (
                        <>
                          <Separator />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTypes({
                                FULL_TIME: false,
                                PART_TIME: false,
                                CONTRACT: false,
                                FREELANCE: false,
                                INTERNSHIP: false,
                                REMOTE: false,
                              });
                              setSelectedTags([]);
                              setSelectedSkills([]);
                              setSelectedCategories([]);
                              setExperienceLevels([]);
                              setPostedDate("");
                              setCompanySize("");
                              setMinCompanyRating(0);
                              setCompanyVerified(null);
                              setWorkLocation("");
                              setCurrency("");
                              setDeadlineFilter("");
                              setHasBenefits(null);
                              setMinSalary(0);
                              setMaxSalary(25);
                              setIncludeNegotiable(true);
                            }}
                            className="w-full"
                          >
                            Clear All Filters
                          </Button>
                        </>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </div>

            {(query || location || selectedTags.length > 0 || Object.values(types).some(Boolean) || sort !== "recent") && (
              <div className="flex flex-wrap items-center gap-2">
                {query ? <Badge variant="outline">Query: {query}</Badge> : null}
                {location ? <Badge variant="outline">Location: {location}</Badge> : null}
                {selectedTags.map((t) => (
                  <Badge key={`tag-${t}`} variant="outline" className="cursor-pointer" onClick={() => toggleTag(t)}>
                    {t} <span className="ml-1">×</span>
                  </Badge>
                ))}
                {Object.entries(types)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <Badge key={`type-${k}`} variant="outline" className="cursor-pointer" onClick={() => toggleType(k as JobType)}>
                      {typeLabels[k as JobType] ?? k} <span className="ml-1">×</span>
                    </Badge>
                  ))}
                {sort !== "recent" ? (
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setSort("recent")}>
                    Sort: {sort} <span className="ml-1">×</span>
                  </Badge>
                ) : null}
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            )}

            {/* Jobs View */}
            {paged.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No jobs found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button variant="outline" onClick={clearAll}>
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {paged.map((job, index) => (
                  <Card
                    key={job.id}
                    className="group relative overflow-hidden border-2 transition-all hover:-translate-y-2 hover:shadow-xl cursor-pointer h-full flex flex-col"
                    onClick={async () => {
                      // Track click for candidates
                      if (isSignedIn) {
                        const token = await getToken();
                        if (token) {
                          apiClient.trackJobClick(job.id, token);
                        }
                      }
                      navigate(`/jobs/${job.id}`);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    
                    <CardHeader className="relative space-y-4">
                      {/* Company Logo & Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-14 w-14 rounded-xl bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                          >
                            {getCompanyInitial(job)}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {job.company?.name || "Company"}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {job.company?.averageRating && job.company.averageRating > 0 ? (
                                <>
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">
                                    {job.company.averageRating.toFixed(1)}
                                  </span>
                                  {job.company.totalReviews && (
                                    <span className="text-xs text-muted-foreground">
                                      ({job.company.totalReviews})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No rating</span>
                              )}
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {getEmploymentTypeLabel(job)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleToggleSave(e, job.id)}
                        >
                          <Heart 
                            className={`h-4 w-4 transition-colors ${
                              savedJobs.has(job.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-muted-foreground hover:text-red-500"
                            }`} 
                          />
                        </Button>
                      </div>

                      {/* Job Title */}
                      <div>
                        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getLocation(job)}
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {postedAgo(job.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-4 flex-1">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {stripHtmlTags(job.description)}
                      </p>

                      {/* Categories & Skills */}
                      <div className="space-y-2">
                        {getCategoryTags(job).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {getCategoryTags(job).map((cat) => (
                              <Badge key={`cat-${cat}`} variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                          {getSkillTags(job).length > 0 ? (
                            getSkillTags(job).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground/50">No skills listed</span>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="relative flex-col gap-3 border-t bg-gradient-to-br from-background to-muted/30 p-4">
                      {/* Salary & Location Section */}
                      <div className="w-full flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Salary</div>
                              <div className="font-semibold text-sm">{getSalaryRange(job)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                              <MapPin className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Location</div>
                              <div className="font-semibold text-sm">{getLocation(job)}</div>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getEmploymentTypeLabel(job)}
                        </Badge>
                      </div>

                      {/* Apply Button - Full Width */}
                      <Button 
                        className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
                        size="lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Apply Now
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th scope="col" className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Job
                              </th>
                              <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Company
                              </th>
                              <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Location
                              </th>
                              <th scope="col" className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Type
                              </th>
                              <th scope="col" className="hidden xl:table-cell px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Salary
                              </th>
                              <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                                Posted
                              </th>
                              <th scope="col" className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-foreground">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {paged.map((job, index) => (
                              <tr
                                key={job.id}
                                className="hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/50"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <td className="px-3 sm:px-4 py-3 sm:py-4">
                                  <div className="font-medium text-sm sm:text-base">{job.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {stripHtmlTags(job.description)}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {getCategoryTags(job).slice(0, 1).map((cat) => (
                                      <Badge key={`cat-${cat}`} variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {cat}
                                      </Badge>
                                    ))}
                                    {getSkillTags(job).slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  {/* Mobile: Show company, location, type inline */}
                                  <div className="md:hidden mt-2 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`h-6 w-6 rounded bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-xs font-bold text-white`}
                                      >
                                        {getCompanyInitial(job)}
                                      </div>
                                      <div className="text-xs font-medium">{job.company?.name || "Company"}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      {getLocation(job)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {getEmploymentTypeLabel(job)}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs font-medium">{getSalaryRange(job)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden md:table-cell px-4 py-3 sm:py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getCompanyColor(index)} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}
                                    >
                                      {getCompanyInitial(job)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm truncate">{job.company?.name || "Company"}</div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {job.company?.averageRating && job.company.averageRating > 0 ? (
                                          <>
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                            <span className="text-xs text-muted-foreground truncate">
                                              {job.company.averageRating.toFixed(1)}
                                              {job.company.totalReviews && ` (${job.company.totalReviews})`}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">No rating</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden lg:table-cell px-4 py-3 sm:py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{getLocation(job)}</span>
                                  </div>
                                </td>
                                <td className="hidden sm:table-cell px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                  <Badge variant="outline" className="text-xs">
                                    {getEmploymentTypeLabel(job)}
                                  </Badge>
                                </td>
                                <td className="hidden xl:table-cell px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                                  {getSalaryRange(job)}
                                </td>
                                <td className="hidden lg:table-cell px-4 py-3 sm:py-4 whitespace-nowrap text-xs text-muted-foreground">
                                  {postedAgo(job.createdAt)}
                                </td>
                                <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSave(e, job.id);
                                      }}
                                    >
                                      <Heart
                                        className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${
                                          savedJobs.has(job.id)
                                            ? "fill-red-500 text-red-500"
                                            : "text-muted-foreground hover:text-red-500"
                                        }`}
                                      />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/jobs/${job.id}`);
                                      }}
                                    >
                                      <span className="hidden sm:inline">View</span>
                                      <span className="sm:hidden">→</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
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
          </div>
        </div>
      </div>
    </main>
  );
};

export default Jobs;
