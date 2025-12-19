import { useState, useEffect, useRef } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { storage } from '@/lib/storage';

interface UseCachedQueryOptions {
    enabled?: boolean;
    refreshTrigger?: number;
}

export function useCachedQuery<T = any>(
    key: string,
    params: any,
    options: UseCachedQueryOptions = {}
) {
    const { enabled = true, refreshTrigger = 0 } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false); // True only if no data at all
    const [validating, setValidating] = useState(false); // True if fetching in background
    const [error, setError] = useState('');

    const cacheKey = `cache:${key}:${JSON.stringify(params)}`;

    useEffect(() => {
        if (!enabled) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey, enabled, refreshTrigger]);

    const fetchData = async () => {
        // 1. Try Cache
        const cached = storage.local.get<T>(cacheKey);

        if (cached) {
            setData(cached);
            setLoading(false);
            setValidating(true); // We have data, but checking for updates
        } else {
            setLoading(true);
            setValidating(true);
        }

        // 2. Fetch Network
        try {
            const res = await api.get(params);
            if (res.success) {
                // Determine what part of response to store
                // Usually we store the whole thing or specific field. 
                // For generic usage, assume the caller wants the whole response or specific parts handled by caller? 
                // Actually, let's just return the whole response object usually, or let caller transform.
                // But typically `api.get` returns `ApiResponse`. 
                // Let's store the raw `ApiResponse` or relevant parts. 
                // To keep it generic, let's assume `T` matches `ApiResponse` or we extract it.
                // But for `DiaryEntry[]` it's inside `entries`. 

                // Let's save the whole response body to cache to be safe.
                storage.local.set(cacheKey, res);

                // Only update state if different? React does this optimization shallowly usually.
                // But `res` is a new object.
                // To avoid flickering if data is identical, we could deep compare, but that's expensive.
                // Just set it.
                setData(res as unknown as T);
                setError('');
            } else {
                if (!cached) setError(res.error || 'Failed to fetch');
            }
        } catch (e: any) {
            if (!cached) setError(e.message || 'Error fetching data');
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    return { data, loading, validating, error };
}
