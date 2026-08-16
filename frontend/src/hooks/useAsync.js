import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small data-fetching primitive: runs `fn` on mount and whenever `deps` change,
 * exposes { data, loading, error, refetch, setData } and ignores results from
 * stale requests so fast filter switching cannot show the wrong data.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (err) {
        if (mounted.current && id === requestId.current) setError(err);
        throw err;
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    if (immediate) run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, refetch: run, setData };
}

/** Debounces a rapidly-changing value (search boxes, filters). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
