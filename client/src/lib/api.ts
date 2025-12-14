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
  benefits?: string | null;
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
  applicationId: string;
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
  recommendation?: string | null;
  createdAt: string;
  updatedAt: string;
  application?: Application;
}

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
    
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

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
}

export const apiClient = new ApiClient(API_BASE_URL);
