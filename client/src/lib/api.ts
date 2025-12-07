const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9999';

export interface Job {
  id: string;
  title: string;
  slug: string;
  company_id: string;
  department_id: string;
  employment_type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERN";
  work_model: "ON_SITE" | "REMOTE" | "HYBRID";
  country: string;
  city: string;
  address: string;
  min_salary: number;
  max_salary: number;
  currency: string;
  experience_min_years: number;
  experience_max_years: number;
  job_level: "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "MANAGER";
  description: string;
  requirements: string;
  nice_to_have: string;
  responsibilities: string;
  skills: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const normalized: ApiResponse<T> =
        raw && typeof raw === 'object' && 'ok' in raw
          ? { success: Boolean(raw.ok), data: (raw.data as T), message: (raw.message as string | undefined) }
          : (raw as ApiResponse<T>);
      return normalized;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getJobs(token?: string): Promise<ApiResponse<Job[]>> {
    return this.request<Job[]>('/jobs', {}, token);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
