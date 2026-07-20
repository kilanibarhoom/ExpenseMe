import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { syncAll } from './index';

/**
 * Runs a sync pass on mount, on reconnect, and whenever the app returns to
 * the foreground. Mirrors the FX auto-refresh policy: failures are silent —
 * the app keeps working from the local mirror and retries next trigger.
 * Pass `enabled: false` while the app is still bootstrapping to avoid racing
 * DbProvider's own one-time sync.
 */
export function useSync(enabled: boolean = true): void {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const runSync = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const { ok } = await syncAll();
        if (ok) await queryClient.invalidateQueries();
      } finally {
        inFlight.current = false;
      }
    };

    void runSync();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runSync();
    });
    const netInfoSub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void runSync();
    });

    return () => {
      appStateSub.remove();
      netInfoSub();
    };
  }, [enabled, queryClient]);
}
