import { useEffect, useState } from "react";
import { useAuth, useAuthEvents } from "../contexts/AuthContext";

export function useSmartQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    cache?: boolean;
    onError?: (err: any) => void;
  }
) {
  const { isSessionReady, user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const cacheKey = `smartquery_cache_${key}_${user?.id || "guest"}`;

  const load = async () => {
    if (!options?.enabled && options?.enabled !== undefined) return;
    try {
      setLoading(true);
      setError(null);

      if (!navigator.onLine && options?.cache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          console.log(`📦 Loaded cached data for ${key}`);
          setData(JSON.parse(cached));
          setLoading(false);
          return; // Added missing return
        }
      }

      // Add the missing fetch logic here
      const result = await fetcher();
      setData(result);
      
      if (options?.cache) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      }
    } catch (err) {
      setError(err);
      options?.onError?.(err);
    } finally {
      setLoading(false);
    }
  }; // Added missing closing brace and parenthesis for the load function

  useEffect(() => {
    if (isSessionReady) {
      load();
    }
  }, [isSessionReady, key, options?.enabled]); // Added missing dependency array

  return { data, loading, error, refetch: load };
} // Added missing closing brace for the component function