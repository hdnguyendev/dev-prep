const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:9999";

// --- Types mapped to backend Prisma schema ---
export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | "REMOTE";
export type JobStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "CLOSED";
export type Currency = "VND" | "USD" | "EUR" | "JPY";
export type ApplicationStatus =
  | "APPLIED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "OFFER_SENT"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";
export type InterviewType = "AI_VIDEO" | "AI_VOICE" | "AI_CHAT" | "CODING_TEST";
export type InterviewStatus = "PENDING" | "IN_PROGRESS" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  isVerified: boolean;
  averageRating?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyReview {
  id: string;
  companyId: string;
  candidateId: string;
  rating: number;
  title?: string | null;
  review?: string | null;
  pros?: string | null;
  cons?: string | null;
  isCurrentEmployee: boolean;
  wouldRecommend: boolean;
  createdAt: string;
  updatedAt: string;
  candidate?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    };
  };
}

export interface Skill {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface JobSkill {
  jobId: string;
  skillId: string;
  isRequired: boolean;
  skill?: Skill;
}

export interface JobCategory {
  jobId: string;
  categoryId: string;
  category?: Category;
}

export interface Job {
  id: string;
  slug: string;
  title: string;
  companyId: string;
  recruiterId: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: string | null;
  interviewQuestions?: string[]; // recruiter-defined interview prompts
  type: JobType;
  status: JobStatus;
  location?: string | null;
  isRemote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: Currency;
  isSalaryNegotiable: boolean;
  experienceLevel?: string | null;
  quantity: number;
  viewsCount: number;
  clicksCount: number;
  publishedAt?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  skills?: JobSkill[];
  categories?: JobCategory[];
}

export interface CandidateProfile {
  id: string;
  userId: string;
  isPublic?: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  cvUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  status: ApplicationStatus;
  rejectionReason?: string | null;
  appliedAt: string;
  updatedAt: string;
  job?: Job;
  candidate?: CandidateProfile;
}

export interface Interview {
  id: string;
  applicationId?: string | null;
  candidateId?: string | null;
  jobId?: string | null;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  accessCode: string;
  sessionUrl?: string | null;
  expiresAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  overallScore?: number | null;
  summary?: string | null;
  recommendation?: string | null;
  createdAt: string;
  updatedAt: string;
  application?: Application;
  candidate?: CandidateProfile;
  job?: Job;
}

export type InterviewFeedback = {
  id: string;
  status: InterviewStatus;
  overallScore?: number | null;
  summary?: string | null;
  recommendation?: string | null;
  aiAnalysisData?: unknown;
  perQuestion: Array<{
    orderIndex: number;
    questionText: string;
    questionCategory?: string | null;
    score?: number | null;
    feedback?: string | null;
  }>;
};

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

type ListParams = {
  page?: number;
  pageSize?: number;
  include?: string;
  q?: string;
  search?: string;
};

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "undefined") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

// Global request cache to prevent duplicate calls
const requestCache = new Map<string, Promise<any>>();

// Generate cache key from request details
function getCacheKey(url: string, method: string, body?: string, token?: string): string {
  // Include query params in URL for proper cache key
  const urlKey = url.split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1] : '');
  return `${method}:${urlKey}:${body || ''}:${token ? token.substring(0, 20) : 'no-auth'}`;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Don't set Content-Type for FormData, browser will set it with boundary
    const isFormData = options.body instanceof FormData;
    const defaultHeaders: Record<string, string> = isFormData
      ? {}
      : { "Content-Type": "application/json" };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    // Generate cache key for GET requests (only cache GET to avoid stale data)
    const method = options.method || 'GET';
    const cacheKey = method === 'GET' 
      ? getCacheKey(url, method, options.body as string, token)
      : null;

    // Check if same request is already in flight (deduplication)
    if (cacheKey && requestCache.has(cacheKey)) {
      const cachedRequest = requestCache.get(cacheKey);
      if (cachedRequest) {
        // Return the existing promise - this prevents duplicate network calls
        return cachedRequest as Promise<ApiResponse<T>>;
      }
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const raw = await response.json();
        const normalized: ApiResponse<T> =
          raw && typeof raw === "object" && "ok" in raw
            ? {
                success: Boolean((raw as any).ok),
                data: (raw as any).data as T,
                message: (raw as any).message as string | undefined,
                meta: (raw as any).meta,
              }
            : (raw as ApiResponse<T>);
        return normalized;
      } catch (error) {
        // Remove from cache on error so retry can happen
        if (cacheKey) {
          requestCache.delete(cacheKey);
        }
        throw error;
      } finally {
        // Remove from cache after request completes (success or error)
        // Use setTimeout to allow other components to use the same promise
        if (cacheKey) {
          setTimeout(() => {
            requestCache.delete(cacheKey);
          }, 100); // Small delay to allow concurrent requests to share the promise
        }
      }
    })();

    // Cache the request promise for GET requests BEFORE making the request
    // This ensures that if StrictMode calls twice, the second call gets the same promise
    if (cacheKey) {
      requestCache.set(cacheKey, requestPromise);
    }

    return requestPromise;
  }

  listJobs(params?: ListParams, token?: string) {
    return this.request<Job[]>(`/jobs${buildQuery(params)}`, {}, token);
  }

  getJob(id: string, token?: string) {
    return this.request<Job>(`/jobs/${id}`, {}, token);
  }

  listCompanies(params?: ListParams, token?: string) {
    return this.request<Company[]>(`/companies${buildQuery(params)}`, {}, token);
  }

  getCompanyBySlug(slug: string, token?: string) {
    return this.request<Company>(`/companies/slug/${slug}`, {}, token);
  }

  getCompanyJobs(companyId: string, params?: ListParams, token?: string) {
    return this.request<Job[]>(`/companies/${companyId}/jobs${buildQuery(params)}`, {}, token);
  }

  listApplications(params?: ListParams, token?: string) {
    return this.request<Application[]>(`/applications${buildQuery(params)}`, {}, token);
  }

  listInterviews(params?: ListParams, token?: string) {
    return this.request<Interview[]>(`/interviews${buildQuery(params)}`, {}, token);
  }

  getInterviewFeedback(interviewId: string, token?: string) {
    return this.request<InterviewFeedback>(`/interviews/${interviewId}/feedback`, {}, token);
  }

  analyzeInterview(interviewId: string, token?: string) {
    return this.request<Interview>(`/interviews/${interviewId}/analyze`, { method: "POST" }, token);
  }

  // Review endpoints
  getCompanyReviews(companyId: string, params?: ListParams, token?: string) {
    return this.request<CompanyReview[]>(`/reviews/companies/${companyId}${buildQuery(params)}`, {}, token);
  }

  getCompanyReviewStats(companyId: string, token?: string) {
    return this.request<{
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
      recommendPercentage: number;
    }>(`/reviews/companies/${companyId}/stats`, {}, token);
  }

  getMyReview(companyId: string, token?: string) {
    return this.request<CompanyReview | null>(`/reviews/my-review/${companyId}`, {}, token);
  }

  createOrUpdateReview(data: {
    companyId: string;
    rating: number;
    title?: string;
    review?: string;
    pros?: string;
    cons?: string;
    isCurrentEmployee?: boolean;
    wouldRecommend?: boolean;
  }, token?: string) {
    return this.request<CompanyReview>(`/reviews`, { method: "POST", body: JSON.stringify(data) }, token);
  }

  deleteReview(reviewId: string, token?: string) {
    return this.request<{ message: string }>(`/reviews/${reviewId}`, { method: "DELETE" }, token);
  }

  // Saved Jobs endpoints
  getSavedJobs(params?: ListParams, token?: string) {
    return this.request<Job[]>(`/saved-jobs${buildQuery(params)}`, {}, token);
  }

  checkIfJobSaved(jobId: string, token?: string) {
    return this.request<{ isSaved: boolean }>(`/saved-jobs/check/${jobId}`, {}, token);
  }

  saveJob(jobId: string, token?: string) {
    return this.request<{ message: string }>(`/saved-jobs/${jobId}`, { method: "POST" }, token);
  }

  unsaveJob(jobId: string, token?: string) {
    return this.request<{ message: string }>(`/saved-jobs/${jobId}`, { method: "DELETE" }, token);
  }

  // Filtered endpoints (role-based filtering)
  getFilteredApplications(params?: ListParams & { jobId?: string }, token?: string) {
    return this.request<Application[]>(`/api/applications${buildQuery(params)}`, {}, token);
  }

  getFilteredJobs(params?: ListParams, token?: string) {
    return this.request<Job[]>(`/api/jobs${buildQuery(params)}`, {}, token);
  }

  getFilteredInterviews(params?: ListParams, token?: string) {
    return this.request<Interview[]>(`/api/interviews${buildQuery(params)}`, {}, token);
  }

  // Auth endpoints
  getMe(token?: string) {
    return this.request<{
      id: string;
      email: string;
      role: string;
      candidateProfile?: CandidateProfile;
      recruiterProfile?: any;
    }>(`/auth/me`, {}, token);
  }

  syncCandidate(token?: string) {
    return this.request<{ success: boolean; message?: string }>(`/auth/sync-candidate`, { method: "POST" }, token);
  }

  // Upload endpoints
  uploadResume(file: File, token?: string) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<{ url: string; message?: string }>(`/upload/resume`, {
      method: "POST",
      body: formData,
    }, token);
  }

  uploadImage(file: File, token?: string) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<{ url: string; message?: string }>(`/upload/image`, {
      method: "POST",
      body: formData,
    }, token);
  }

  uploadFile(file: File, token?: string) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<{ url: string; message?: string }>(`/upload`, {
      method: "POST",
      body: formData,
    }, token);
  }

  // Application endpoints
  createApplication(data: {
    jobId: string;
    resumeUrl?: string;
    coverLetter?: string;
  }, token?: string) {
    return this.request<Application>(`/applications`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
  }

  // Company endpoints
  updateCompany(companyId: string, data: Partial<Company>, token?: string) {
    return this.request<Company>(`/companies/${companyId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
  }

  // Job endpoints with include
  getJobWithInclude(jobId: string, include?: string, token?: string) {
    const params = include ? { include } : undefined;
    return this.request<Job>(`/jobs/${jobId}${buildQuery(params)}`, {}, token);
  }

  getJobWithSkills(jobId: string, token?: string) {
    return this.getJobWithInclude(jobId, "skills", token);
  }

  // Education endpoints
  createEducation(data: {
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }, token?: string) {
    return this.request<{ id: string; [key: string]: any }>(`/auth/education`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
  }

  updateEducation(educationId: string, data: {
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }, token?: string) {
    return this.request<{ id: string; [key: string]: any }>(`/auth/education/${educationId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
  }

  deleteEducation(educationId: string, token?: string) {
    return this.request<{ success: boolean; message?: string }>(`/auth/education/${educationId}`, {
      method: "DELETE",
    }, token);
  }

  // Project endpoints
  createProject(data: {
    name: string;
    description?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    technologies?: string[];
  }, token?: string) {
    return this.request<{ id: string; [key: string]: any }>(`/auth/project`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
  }

  updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    technologies?: string[];
  }, token?: string) {
    return this.request<{ id: string; [key: string]: any }>(`/auth/project/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
  }

  deleteProject(projectId: string, token?: string) {
    return this.request<{ success: boolean; message?: string }>(`/auth/project/${projectId}`, {
      method: "DELETE",
    }, token);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
