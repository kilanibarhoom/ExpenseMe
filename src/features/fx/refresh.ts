import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/lib/settings-store';

import { openErApiProvider, type FxProvider } from './provider';
import { upsertRates } from './repo';
import { FX_QUERY_KEY } from './useFxRates';

/**
 * Fetch fresh rates and persist them. Throws on network/provider failure —
 * callers decide whether that is silent (auto refresh) or surfaced (manual).
 */
export async function refreshRatesNow(provider: FxProvider = openErApiProvider): Promise<void> {
  const rates = await provider.fetchRatesToILS();
  await upsertRates(rates, provider.id);
  await useSettings.getState().setLastFxSyncAt(new Date());
}

function isStale(lastSync: Date | null, refreshHours: number): boolean {
  if (!lastSync) return true;
  return Date.now() - lastSync.getTime() > refreshHours * 60 * 60 * 1000;
}

/**
 * Spec §5 refresh policy: on launch and on app foreground, refresh when the
 * cache is older than `fx_refresh_hours`. Failures are swallowed — the app
 * keeps using the latest cached (or fallback) rates offline.
 */
export function useFxAutoRefresh(): void {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  useEffect(() => {
    const maybeRefresh = async () => {
      const { lastFxSyncAt, fxRefreshHours } = useSettings.getState();
      if (inFlight.current || !isStale(lastFxSyncAt, fxRefreshHours)) return;
      inFlight.current = true;
      try {
        await refreshRatesNow();
        await queryClient.invalidateQueries({ queryKey: FX_QUERY_KEY });
      } catch {
        // offline or provider down — cached rates remain in use
      } finally {
        inFlight.current = false;
      }
    };

    void maybeRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void maybeRefresh();
    });
    return () => sub.remove();
  }, [queryClient]);
}
