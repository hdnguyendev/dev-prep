import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "../api";

type Fetcher<T> = (token?: string) => Promise<ApiResponse<T[]>>;

export const useApiList = <T,>(fetcher: Fetcher<T>, deps: unknown[] = []) => {
  const { getToken } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApiResponse<T[]>["meta"]>();
  
  // Use refs to track request state and prevent duplicate calls
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    // Generate unique request ID
    const currentRequestId = ++requestIdRef.current;
    
    // If already loading, abort previous request
    if (isLoadingRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Mark as loading
    isLoadingRef.current = true;
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      
      // Call fetcher - it will use global request cache to prevent duplicates
      const res = await fetcher(token ?? undefined);
      
      // Check if this is still the latest request and component is mounted
      // Also check if request was aborted
      if (currentRequestId !== requestIdRef.current || !isMountedRef.current || abortController.signal.aborted) {
        return;
      }
      
      if (res.success) {
        setData(res.data);
        setMeta(res.meta);
      } else {
        setError(res.message || "Failed to fetch data");
      }
    } catch {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // Only set error if this is still the latest request
      if (currentRequestId === requestIdRef.current && isMountedRef.current && !abortController.signal.aborted) {
        setError("Unexpected error");
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        isLoadingRef.current = false;
        if (isMountedRef.current && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }
  }, [fetcher, getToken]);

  useEffect(() => {
    isMountedRef.current = true;
    isLoadingRef.current = false;
    load();
    
    // Cleanup: abort request and mark as unmounted
    return () => {
      isMountedRef.current = false;
      isLoadingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, meta, refresh: load };
};

