import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "../api";

type Fetcher<T> = (token?: string) => Promise<ApiResponse<T[]>>;

export const useApiList = <T,>(fetcher: Fetcher<T>, deps: unknown[] = []) => {
  const { getToken } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApiResponse<T[]>["meta"]>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const res = await fetcher(token ?? undefined);
      if (res.success) {
        setData(res.data);
        setMeta(res.meta);
      } else {
        setError(res.message || "Failed to fetch data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [fetcher, getToken]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, meta, refresh: load };
};

