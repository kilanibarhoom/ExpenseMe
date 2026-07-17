import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getCachedRates, type CachedRates } from './repo';

export const FX_QUERY_KEY = ['fx-rates'];

/**
 * Cached exchange rates for combined/ILS figures.
 * Background refresh + manual refresh are layered on in features/fx/refresh.ts.
 */
export function useFxRates(): {
  rates: { USD: number; JOD: number };
  fetchedAt: Date | null;
  invalidate: () => void;
} {
  const queryClient = useQueryClient();
  const { data } = useQuery<CachedRates>({
    queryKey: FX_QUERY_KEY,
    queryFn: getCachedRates,
    staleTime: 60 * 1000,
  });
  return {
    rates: { USD: data?.USD ?? 3.6, JOD: data?.JOD ?? 5.1 },
    fetchedAt: data?.fetchedAt ?? null,
    invalidate: () => void queryClient.invalidateQueries({ queryKey: FX_QUERY_KEY }),
  };
}
