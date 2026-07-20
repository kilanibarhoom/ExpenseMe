import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DbProvider } from '@/db/DbProvider';
import { useFxAutoRefresh } from '@/features/fx/refresh';
import { queryClient } from '@/lib/query-client';

function FxAutoRefresh() {
  useFxAutoRefresh();
  return null;
}

/**
 * Native pull-up sheet with real Liquid Glass on iOS 26 — the transparent
 * `contentStyle` is required for the glass material to show through;
 * `gestureEnabled: false` avoids the dismiss-drag gesture fighting the
 * screen's own scroll/keyboard handling.
 */
const glassSheetOptions = {
  headerShown: false,
  presentation: 'formSheet' as const,
  gestureEnabled: false,
  sheetGrabberVisible: true,
  contentStyle: { backgroundColor: 'transparent' },
  sheetAllowedDetents: [0.1, 0.5, 1],
  sheetInitialDetentIndex: 1,
  sheetLargestUndimmedDetentIndex: 0,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <DbProvider>
          <FxAutoRefresh />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="quick-add"
              options={{ presentation: 'modal', sheetGrabberVisible: true }}
            />
            <Stack.Screen name="debt/entry" options={glassSheetOptions} />
            <Stack.Screen name="debt/edit" options={glassSheetOptions} />
          </Stack>
        </DbProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
