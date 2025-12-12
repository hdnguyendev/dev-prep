import { useAuth } from "@clerk/clerk-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:9999";

export type AdminListResponse = {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  meta?: { page: number; pageSize: number; total: number };
  message?: string;
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

const buildIdPath = (primaryKeys: string[], row: Record<string, unknown>) => {
  const parts = primaryKeys.map((k) => {
    const val = row[k];
    if (val === undefined || val === null) {
      throw new Error(`Missing primary key "${k}"`);
    }
    return encodeURIComponent(String(val));
  });
  return parts.join("/");
};

export const adminClient = {
  async list(resourcePath: string, params?: { page?: number; pageSize?: number }, token?: string) {
    const url = `${API_BASE_URL}/${resourcePath}${buildQuery(params)}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`List failed ${res.status}`);
    return (await res.json()) as AdminListResponse;
  },
  async get(resourcePath: string, idPath: string, token?: string) {
    const url = `${API_BASE_URL}/${resourcePath}/${idPath}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Get failed ${res.status}`);
    return res.json();
  },
  async create(resourcePath: string, data: Record<string, unknown>, token?: string) {
    const res = await fetch(`${API_BASE_URL}/${resourcePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Create failed ${res.status}`);
    return res.json();
  },
  async update(
    resourcePath: string,
    primaryKeys: string[],
    row: Record<string, unknown>,
    data: Record<string, unknown>,
    token?: string
  ) {
    const idPath = buildIdPath(primaryKeys, row);
    const res = await fetch(`${API_BASE_URL}/${resourcePath}/${idPath}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Update failed ${res.status}`);
    return res.json();
  },
  async remove(resourcePath: string, primaryKeys: string[], row: Record<string, unknown>, token?: string) {
    const idPath = buildIdPath(primaryKeys, row);
    const res = await fetch(`${API_BASE_URL}/${resourcePath}/${idPath}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Delete failed ${res.status}`);
    return res.json();
  },
};

export const useAdminToken = () => {
  const { getToken } = useAuth();
  return getToken;
};
